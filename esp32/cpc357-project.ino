/*
 * PROJECT: Smart Stray Animal Feeder + Water Dispenser
 * BOARD: Cytron Maker Feather AIoT S3 (ESP32-S3)
 * 
 * HARDWARE MAPPING:
 * - PIR Sensor (Food):     Digital Input = D9
 * - PIR Sensor (Water):    Digital Input = D10
 * - Food Servo:            PWM Signal = D14
 * - Water Servo:           PWM Signal = D15
 * - MH-RD Rain Sensor:     Analog Input = A3 (GPIO1)
 * - Float Water Level:     Digital Input = D16
 * - HX711 Scale (Food):    DT=D17, SCK=D18
 * - Power Control:         D11 (Must be HIGH to enable 3V3 peripherals)
 * 
 * CLOUD CONNECTIVITY:
 * - WiFi connection to local network
 * - MQTT to Google Cloud Pub/Sub via mqtt.googleapis.com
 * - Publishes sensor data and dispense events
 * - Subscribes to remote commands
 */

#include <Wire.h>
#include "HX711.h"
#include <ESP32Servo.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ============================================
// WIFI & CLOUD CONFIGURATION
// ============================================
// WiFi credentials
const char* WIFI_SSID = "Nak wifi beli laaaa";
const char* WIFI_PASSWORD = "papajala";

// Device Configuration
const char* DEVICE_ID = "esp32-feeder-01";

// ============================================
// MOSQUITTO MQTT BROKER CONFIGURATION (GCP VM)
// ============================================
// TODO: Replace with your GCP VM's EXTERNAL IP address
// Find it in GCP Console > Compute Engine > VM instances > External IP column
const char* MQTT_SERVER = "34.87.168.186";  // e.g., "34.123.45.67" 136.110.63.138
const int MQTT_PORT = 1883;                            // Standard MQTT port

// TODO: Replace with the credentials you created with mosquitto_passwd
const char* MQTT_USER = "esp32_feeder";                // The user you created
const char* MQTT_PASS = "Papajala*123";          // The password you set

// MQTT Topics - Matches the MQTT-Supabase bridge expectations
String SENSOR_TOPIC;      // petfeeder/{device_id}/sensors
String DISPENSE_TOPIC;    // petfeeder/{device_id}/dispense  
String STATUS_TOPIC;      // petfeeder/{device_id}/status
String COMMANDS_TOPIC;    // petfeeder/{device_id}/commands
String HEARTBEAT_TOPIC;   // petfeeder/{device_id}/heartbeat

// NTP Server for timestamps
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 0;
const int DAYLIGHT_OFFSET_SEC = 0;

// Firmware version
const char* FIRMWARE_VERSION = "1.0.0";

// --- PIN DEFINITIONS ---
#define PIN_PIR_FOOD        14   // PIR motion sensor for food area
#define PIN_PIR_WATER       21  // PIR motion sensor for water area
#define PIN_SERVO_FOOD      38  // Servo for food dispenser
#define PIN_SERVO_WATER     39  // Servo for water dispenser
#define PIN_RAIN_ANALOG     5   // MH-RD rain sensor analog (A3)
#define PIN_WATER_LEVEL     18  // Float switch (LOW=full, HIGH=empty)
#define PIN_SCALE_DT        16  // HX711 data pin
#define PIN_SCALE_SCK       15  // HX711 clock pin
#define PIN_BUTTON_FOOD     4  // Manual food dispense button
#define PIN_BUTTON_WATER    6  // Manual water dispense button
#define PIN_PWR_CTRL        11  // Maker Feather 3V3 Regulator Control

// --- CONFIGURATION CONSTANTS ---
// Servo Angles
const int SERVO_OPEN_ANGLE = 90;       // Angle to release food/water
const int SERVO_CLOSE_ANGLE = 0;       // Angle to stop dispensing

// Timing
const int FOOD_DISPENSE_TIME_MS = 800;    // How long food gate stays open
const int WATER_DISPENSE_TIME_MS = 1500;  // How long water valve stays open
const unsigned long PIR_COOLDOWN_MS = 5000; // 5 second cooldown between triggers
const unsigned long SETTLE_TIME_MS = 2000;  // Time to wait after servo movement

// Weight Thresholds
const float MIN_FOOD_DISPENSE_WEIGHT = 5.0; // Minimum grams for successful dispense
const float LOW_FOOD_THRESHOLD = 50.0;      // Alert when food hopper below this

// Rain Sensor Thresholds (0-4095 on ESP32 12-bit ADC)
const int RAIN_DRY_THRESHOLD = 2800;    // Above this = dry (no rain)
const int RAIN_WET_THRESHOLD = 1200;    // Below this = heavy rain

// --- TEST MODE (set to true to bypass missing sensors) ---
const bool BYPASS_WATER_LEVEL_SENSOR = false;  // Set to false when sensor is connected
const bool BYPASS_RAIN_SENSOR = false;         // Set to false when sensor is connected (always dry when true)

// --- CALIBRATION ---
// Formula: (Raw_Value - Tare_Value) / Known_Weight_Grams
const float LOADCELL_CALIBRATION_FACTOR = 110.060; 

// --- OBJECTS ---
HX711 scale;
Servo foodServo;
Servo waterServo;

// WiFi and MQTT clients
WiFiClient wifiClient;           // Use non-secure client for Mosquitto (port 1883)
// WiFiClientSecure wifiClient;  // Uncomment for TLS (port 8883)
PubSubClient mqttClient(wifiClient);

// --- STATE TRACKING ---
unsigned long lastFoodDispenseTime = 0;
unsigned long lastWaterDispenseTime = 0;
unsigned long lastFoodButtonPress = 0;
unsigned long lastWaterButtonPress = 0;
bool rainDetected = false;

// Cloud connectivity state
bool wifiConnected = false;
bool mqttConnected = false;
unsigned long lastTelemetryTime = 0;
unsigned long lastHeartbeatTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 30000;  // Send telemetry every 30 seconds
const unsigned long HEARTBEAT_INTERVAL_MS = 60000;  // Send heartbeat every 60 seconds
const unsigned long MQTT_RECONNECT_INTERVAL_MS = 5000;
unsigned long lastMqttReconnectAttempt = 0;

// Button debouncing
const unsigned long BUTTON_DEBOUNCE_MS = 50;

// State tracking for change detection (to send instant telemetry updates)
bool lastWaterLevelOk = true;
bool lastFoodLevelOk = true;  // Track food level status
bool lastFoodPirState = false;
bool lastWaterPirState = false;

void setup() {
  // 1. Initialize Debug Serial (USB)
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n>>> SYSTEM STARTING: Smart Animal Feeder/Waterer <<<");

  // 2. Enable Peripheral Power (Specific to Maker Feather)
  pinMode(PIN_PWR_CTRL, OUTPUT);
  digitalWrite(PIN_PWR_CTRL, HIGH); 
  delay(100);

  // 3. Initialize PIR Sensors
  pinMode(PIN_PIR_FOOD, INPUT);
  pinMode(PIN_PIR_WATER, INPUT);
  Serial.println("- PIR Sensors Initialized");

  // 4. Initialize Rain Sensor
  pinMode(PIN_RAIN_ANALOG, INPUT);
  Serial.println("- Rain Sensor Initialized");

  // 5. Initialize Water Level Sensor
  pinMode(PIN_WATER_LEVEL, INPUT_PULLUP); // Use internal pullup
  Serial.println("- Water Level Sensor Initialized");

  // 6. Initialize Manual Buttons
  pinMode(PIN_BUTTON_FOOD, INPUT_PULLUP); // Use internal pullup
  pinMode(PIN_BUTTON_WATER, INPUT_PULLUP); // Use internal pullup
  Serial.println("- Manual Buttons Initialized");

  // 7. Initialize Servos
  foodServo.attach(PIN_SERVO_FOOD);
  waterServo.attach(PIN_SERVO_WATER);
  foodServo.write(SERVO_CLOSE_ANGLE);
  waterServo.write(SERVO_CLOSE_ANGLE);
  Serial.println("- Servos Initialized");

  // 8. Initialize HX711 Scale
  scale.begin(PIN_SCALE_DT, PIN_SCALE_SCK);
  scale.set_scale(LOADCELL_CALIBRATION_FACTOR);
  scale.tare();
  Serial.println("- Food Scale Initialized");

  // 9. Setup MQTT topic paths (matches the bridge format)
  SENSOR_TOPIC = String("petfeeder/") + DEVICE_ID + "/sensors";
  DISPENSE_TOPIC = String("petfeeder/") + DEVICE_ID + "/dispense";
  STATUS_TOPIC = String("petfeeder/") + DEVICE_ID + "/status";
  COMMANDS_TOPIC = String("petfeeder/") + DEVICE_ID + "/commands";
  HEARTBEAT_TOPIC = String("petfeeder/") + DEVICE_ID + "/heartbeat";

  // 10. Connect to WiFi
  setupWiFi();

  // 11. Configure time for timestamps
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  Serial.println("- Waiting for NTP time sync...");
  struct tm timeinfo;
  int retries = 0;
  while (!getLocalTime(&timeinfo) && retries < 10) {
    delay(1000);
    retries++;
  }
  if (retries < 10) {
    Serial.println("- Time synchronized");
  } else {
    Serial.println("- WARNING: Time sync failed");
  }

  // 12. Setup MQTT (Mosquitto)
  setupMQTT();

  // 13. Warm-up PIR sensors (reduced from 60s for faster startup)
  Serial.println("- Warming up PIR sensors (10 seconds)...");
  delay(10000);

  Serial.println(">>> SYSTEM READY <<<\n");
  printStatus();
}

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    setupWiFi();
  }

  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    mqttConnected = false;
    reconnectMQTT();
  }
  mqttClient.loop();  // Process incoming messages

  // Check sensors periodically
  checkRainSensor();
  checkWaterLevel();
  checkFoodLevel();
  
  // Check manual buttons (higher priority than PIR)
  checkManualButtons();
  
  // Check PIR sensors for animal presence
  checkFoodDispenser();
  checkWaterDispenser();

  // Send periodic telemetry
  if (millis() - lastTelemetryTime > TELEMETRY_INTERVAL_MS) {
    sendTelemetry();
    lastTelemetryTime = millis();
  }

  // Send heartbeat
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }
  
  delay(100); // Small delay to prevent excessive polling
}

// ============================================
// WIFI & MQTT FUNCTIONS
// ============================================
void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n- WiFi Connected!");
    Serial.printf("- IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n- WiFi Connection FAILED! Will retry...");
  }
}

void setupMQTT() {
  // Configure MQTT client for Mosquitto broker
  // No certificate needed for unencrypted connection (port 1883)
  // For TLS (port 8883), uncomment wifiClient.setCACert() and use WiFiClientSecure
  
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1024);  // Increase buffer for larger messages
  
  Serial.printf("- MQTT Configured for broker: %s:%d\n", MQTT_SERVER, MQTT_PORT);
}

void reconnectMQTT() {
  if (millis() - lastMqttReconnectAttempt < MQTT_RECONNECT_INTERVAL_MS) {
    return;
  }
  lastMqttReconnectAttempt = millis();

  if (!wifiConnected) {
    return;
  }

  Serial.println("Attempting MQTT connection to Mosquitto...");

  // Simple client ID for Mosquitto
  String clientId = String("esp32-") + DEVICE_ID + "-" + String(random(0xffff), HEX);

  // Connect to Mosquitto broker
  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    // With authentication
    connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    // Without authentication (anonymous)
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected) {
    mqttConnected = true;
    Serial.println("- MQTT Connected to Mosquitto!");
    Serial.printf("- Client ID: %s\n", clientId.c_str());
    
    // Subscribe to commands topic
    if (mqttClient.subscribe(COMMANDS_TOPIC.c_str())) {
      Serial.printf("- Subscribed to: %s\n", COMMANDS_TOPIC.c_str());
    }
    
    // Publish online status
    StaticJsonDocument<256> statusDoc;
    statusDoc["is_online"] = true;
    statusDoc["ip_address"] = WiFi.localIP().toString();
    statusDoc["firmware_version"] = FIRMWARE_VERSION;
    
    String statusJson;
    serializeJson(statusDoc, statusJson);
    mqttClient.publish(STATUS_TOPIC.c_str(), statusJson.c_str(), true);  // Retained message
  } else {
    Serial.printf("- MQTT connection failed, rc=%d\n", mqttClient.state());
    Serial.println("  Error codes: -4=timeout, -3=lost, -2=failed, -1=disconnected");
    Serial.println("  Will retry in 5 seconds...");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.printf("\n[MQTT] Message received on topic: %s\n", topic);
  
  // Parse JSON payload
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
    return;
  }

  // Support both "command" and "id" format from bridge
  const char* command = doc["command"];
  const char* commandId = doc["id"];  // Bridge sends "id" not "command_id"
  
  // Fallback to command_id if id not present
  if (!commandId) {
    commandId = doc["command_id"];
  }
  
  Serial.printf("[MQTT] Command: %s, ID: %s\n", command, commandId ? commandId : "none");

  // Execute command
  bool success = false;
  if (strcmp(command, "dispense_food") == 0) {
    Serial.println("[MQTT] Executing remote food dispense...");
    
    // Check if it's raining
    if (rainDetected) {
      Serial.println("[MQTT] ! Cannot dispense food: It's raining !");
      success = false;
    } else {
      dispenseFoodWithReport("remote", commandId);
      success = true;
    }
  } 
  else if (strcmp(command, "dispense_water") == 0) {
    Serial.println("[MQTT] Executing remote water dispense...");
    
    // Check if it's raining
    if (rainDetected) {
      Serial.println("[MQTT] ! Cannot dispense water: It's raining !");
      success = false;
    } else {
      dispenseWaterWithReport("remote", commandId);
      success = true;
    }
  }
  else if (strcmp(command, "calibrate") == 0) {
    Serial.println("[MQTT] Executing scale calibration...");
    scale.tare();
    success = true;
  }
  else {
    Serial.printf("[MQTT] Unknown command: %s\n", command);
  }

  // Send command response
  if (commandId) {
    sendCommandResponse(commandId, success ? "executed" : "failed");
  }
}

// ============================================
// TELEMETRY FUNCTIONS
// ============================================
void sendTelemetry() {
  if (!mqttConnected) return;

  float foodWeight = scale.get_units(3);
  bool waterLevelOk = BYPASS_WATER_LEVEL_SENSOR ? true : (digitalRead(PIN_WATER_LEVEL) == LOW);
  int rainValue = BYPASS_RAIN_SENSOR ? 4095 : analogRead(PIN_RAIN_ANALOG);

  // Format matches what the bridge expects for sensor_readings table
  StaticJsonDocument<512> doc;
  doc["food_weight"] = foodWeight;
  doc["water_level_ok"] = waterLevelOk;
  doc["rain_value"] = rainValue;
  doc["is_raining"] = rainDetected;
  doc["food_pir_triggered"] = digitalRead(PIN_PIR_FOOD) == HIGH;
  doc["water_pir_triggered"] = digitalRead(PIN_PIR_WATER) == HIGH;

  String jsonString;
  serializeJson(doc, jsonString);

  if (mqttClient.publish(SENSOR_TOPIC.c_str(), jsonString.c_str())) {
    Serial.println("[TELEMETRY] Sensor data sent to: " + SENSOR_TOPIC);
  } else {
    Serial.println("[TELEMETRY] Failed to send sensor data");
  }
}

void sendHeartbeat() {
  if (!mqttConnected) return;

  StaticJsonDocument<256> doc;
  doc["is_online"] = true;
  doc["ip_address"] = WiFi.localIP().toString();
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["uptime_ms"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();

  String jsonString;
  serializeJson(doc, jsonString);

  mqttClient.publish(HEARTBEAT_TOPIC.c_str(), jsonString.c_str());
  
  // Also update status topic
  mqttClient.publish(STATUS_TOPIC.c_str(), jsonString.c_str());
}

void sendDispenseEvent(const char* eventType, const char* triggerSource, 
                       float amountDispensed, float weightBefore, float weightAfter) {
  if (!mqttConnected) return;

  // Format matches what the bridge expects for dispense_events table
  StaticJsonDocument<512> doc;
  doc["event_type"] = eventType;
  doc["trigger_source"] = triggerSource;
  doc["amount_dispensed"] = amountDispensed;
  doc["food_weight_before"] = weightBefore;
  doc["food_weight_after"] = weightAfter;

  String jsonString;
  serializeJson(doc, jsonString);

  if (mqttClient.publish(DISPENSE_TOPIC.c_str(), jsonString.c_str())) {
    Serial.printf("[TELEMETRY] Dispense event sent: %s via %s\n", eventType, triggerSource);
  }
}

void sendCommandResponse(const char* commandId, const char* status) {
  if (!mqttConnected || !commandId) return;

  // Update command status - bridge will pick this up
  StaticJsonDocument<256> doc;
  doc["command_id"] = commandId;
  doc["status"] = status;
  doc["device_id"] = DEVICE_ID;

  String jsonString;
  serializeJson(doc, jsonString);

  String responseTopic = String("petfeeder/") + DEVICE_ID + "/responses";
  mqttClient.publish(responseTopic.c_str(), jsonString.c_str());
}

// ============================================
// MANUAL BUTTON CONTROL
// ============================================
void checkManualButtons() {
  // Food Button - Active LOW (pressed = LOW)
  static bool lastFoodButtonState = HIGH;
  bool currentFoodButton = digitalRead(PIN_BUTTON_FOOD);
  
  // Detect button press (HIGH to LOW transition)
  if (lastFoodButtonState == HIGH && currentFoodButton == LOW) {
    delay(BUTTON_DEBOUNCE_MS); // Debounce
    if (digitalRead(PIN_BUTTON_FOOD) == LOW) { // Confirm still pressed
      Serial.println("\n[MANUAL] Food button pressed!");
      
      // Check if it's raining
      if (rainDetected) {
        Serial.println("[MANUAL] ! Cannot dispense food: It's raining !");
        lastFoodButtonState = currentFoodButton;  // Update state to prevent repeated messages
        return;
      }
      
      dispenseFoodWithReport("manual", NULL);
      lastFoodDispenseTime = millis(); // Update cooldown
      lastFoodButtonPress = millis();
    }
  }
  lastFoodButtonState = currentFoodButton;
  
  // Water Button - Active LOW (pressed = LOW)
  static bool lastWaterButtonState = HIGH;
  bool currentWaterButton = digitalRead(PIN_BUTTON_WATER);
  
  // Detect button press (HIGH to LOW transition)
  if (lastWaterButtonState == HIGH && currentWaterButton == LOW) {
    delay(BUTTON_DEBOUNCE_MS); // Debounce
    if (digitalRead(PIN_BUTTON_WATER) == LOW) { // Confirm still pressed
      Serial.println("\n[MANUAL] Water button pressed!");
      
      // Check if it's raining
      if (rainDetected) {
        Serial.println("[MANUAL] ! Cannot dispense water: It's raining !");
        lastWaterButtonState = currentWaterButton;  // Update state to prevent repeated messages
        return;
      }
      
      // Check water level before dispensing (skip if bypassed for testing)
      if (!BYPASS_WATER_LEVEL_SENSOR && digitalRead(PIN_WATER_LEVEL) == HIGH) {
        Serial.println("[MANUAL] ! Cannot dispense: Water tank empty !");
        lastWaterButtonState = currentWaterButton;  // Update state to prevent repeated messages
        return;
      }
      
      dispenseWaterWithReport("manual", NULL);
      lastWaterDispenseTime = millis(); // Update cooldown
      lastWaterButtonPress = millis();
    }
  }
  lastWaterButtonState = currentWaterButton;
}

// ============================================
// FOOD DISPENSER LOGIC
// ============================================
void checkFoodDispenser() {
  // Check if animal is detected by food PIR (for telemetry updates)
  bool currentFoodPir = (digitalRead(PIN_PIR_FOOD) == HIGH);
  if (currentFoodPir != lastFoodPirState) {
    lastFoodPirState = currentFoodPir;
    // Send instant telemetry when PIR state changes
    sendTelemetry();
  }
  
  // Only dispense if cooldown period has passed
  if (millis() - lastFoodDispenseTime < PIR_COOLDOWN_MS) {
    return;
  }

  // Don't dispense food if it's raining
  if (rainDetected) {
    return;
  }

  // Check if animal is detected by food PIR
  if (currentFoodPir) {
    Serial.println("\n[FOOD] Animal detected at food station!");
    
    // Double-check after brief delay to reduce false triggers
    delay(500);
    if (digitalRead(PIN_PIR_FOOD) == HIGH) {
      dispenseFood();
      lastFoodDispenseTime = millis();
    }
  }
}

void dispenseFood() {
  dispenseFoodWithReport("pir", NULL);
}

void dispenseFoodWithReport(const char* triggerSource, const char* commandId) {
  Serial.println("[FOOD] Dispensing food...");
  
  // 1. Check current food weight
  float weightBefore = scale.get_units(5);
  Serial.printf("[FOOD] Weight before: %.2f g\n", weightBefore);

  if (weightBefore < 10.0) {
    Serial.println("[FOOD] ! WARNING: Food hopper appears empty !");
  }

  // 2. Open food gate
  foodServo.write(SERVO_OPEN_ANGLE);
  delay(FOOD_DISPENSE_TIME_MS);
  
  // 3. Close food gate
  foodServo.write(SERVO_CLOSE_ANGLE);
  
  // 4. Wait for scale to settle
  Serial.println("[FOOD] Waiting for scale to settle...");
  delay(SETTLE_TIME_MS);

  // 5. Measure weight after dispensing
  float weightAfter = scale.get_units(5);
  Serial.printf("[FOOD] Weight after: %.2f g\n", weightAfter);

  // 6. Calculate amount dispensed
  float dispensed = weightBefore - weightAfter;

  if (dispensed > MIN_FOOD_DISPENSE_WEIGHT) {
    Serial.printf("[FOOD] >> SUCCESS: Dispensed %.2f g\n", dispensed);
  } else {
    Serial.printf("[FOOD] >> WARNING: Only %.2f g dispensed (possible jam)\n", dispensed);
  }
  
  // 7. Send event to cloud
  sendDispenseEvent("food", triggerSource, dispensed, weightBefore, weightAfter);
  
  Serial.printf("[FOOD] Cooldown active for %d seconds...\n", PIR_COOLDOWN_MS/1000);
}

// ============================================
// WATER DISPENSER LOGIC
// ============================================
void checkWaterDispenser() {
  // Check if animal is detected by water PIR (for telemetry updates)
  bool currentWaterPir = (digitalRead(PIN_PIR_WATER) == HIGH);
  if (currentWaterPir != lastWaterPirState) {
    lastWaterPirState = currentWaterPir;
    // Send instant telemetry when PIR state changes
    sendTelemetry();
  }
  
  // Only dispense if cooldown period has passed
  if (millis() - lastWaterDispenseTime < PIR_COOLDOWN_MS) {
    return;
  }

  // Don't dispense water if it's raining
  if (rainDetected) {
    return;
  }

  // Check water level first (skip if bypassed for testing)
  bool waterAvailable = BYPASS_WATER_LEVEL_SENSOR || (digitalRead(PIN_WATER_LEVEL) == LOW);
  if (!waterAvailable) {
    // Water empty but don't print here - checkWaterLevel() already handles it
    return;
  }

  // Check if animal is detected by water PIR
  if (currentWaterPir) {
    Serial.println("\n[WATER] Animal detected at water station!");
    
    // Double-check after brief delay
    delay(500);
    if (digitalRead(PIN_PIR_WATER) == HIGH) {
      dispenseWater();
      lastWaterDispenseTime = millis();
    }
  }
}

void dispenseWater() {
  dispenseWaterWithReport("pir", NULL);
}

void dispenseWaterWithReport(const char* triggerSource, const char* commandId) {
  Serial.println("[WATER] Dispensing water...");
  
  // Open water valve
  waterServo.write(SERVO_OPEN_ANGLE);
  delay(WATER_DISPENSE_TIME_MS);
  
  // Close water valve
  waterServo.write(SERVO_CLOSE_ANGLE);
  
  Serial.println("[WATER] >> Water dispensed successfully");
  
  // Send event to cloud
  sendDispenseEvent("water", triggerSource, 0, 0, 0);
  
  Serial.printf("[WATER] Cooldown active for %d seconds...\n", PIR_COOLDOWN_MS/1000);
}

// ============================================
// SENSOR MONITORING FUNCTIONS
// ============================================
void checkRainSensor() {
  // Skip rain detection if bypassed (always dry)
  if (BYPASS_RAIN_SENSOR) {
    rainDetected = false;
    return;
  }
  
  // Read rain sensor value on every call for instant updates
  int rainValue = analogRead(PIN_RAIN_ANALOG);
  bool wasRaining = rainDetected;
  
  if (rainValue > RAIN_DRY_THRESHOLD) {
    rainDetected = false;
  } else if (rainValue < RAIN_WET_THRESHOLD) {
    rainDetected = true;
  }
  
  // Only print when status changes
  if (rainDetected != wasRaining) {
    Serial.printf("[RAIN] Status changed: %s (value: %d)\n", 
                  rainDetected ? "RAINING" : "DRY", rainValue);
    if (rainDetected) {
      Serial.println("[RAIN] Water dispensing disabled during rain");
    } else {
      Serial.println("[RAIN] Weather cleared - dispensing enabled");
    }
    
    // Immediately send telemetry update when rain status changes
    Serial.println("[RAIN] Sending instant telemetry update...");
    sendTelemetry();
  }
}

void checkWaterLevel() {
  // Always check current water level status for instant telemetry updates
  bool waterLevelOk = BYPASS_WATER_LEVEL_SENSOR ? true : (digitalRead(PIN_WATER_LEVEL) == LOW);
  
  // Only print and send telemetry when status changes
  if (waterLevelOk != lastWaterLevelOk) {
    if (!waterLevelOk) {
      Serial.println("[WATER] ! ALERT: Water tank is EMPTY - Please refill !");
      Serial.println("[WATER] Sending instant telemetry update...");
    } else {
      Serial.println("[WATER] Water tank refilled");
      Serial.println("[WATER] Sending instant telemetry update...");
    }
    lastWaterLevelOk = waterLevelOk;
    
    // Send telemetry immediately when water level changes
    sendTelemetry();
  }
}

void checkFoodLevel() {
  static unsigned long lastFoodCheck = 0;
  
  if (millis() - lastFoodCheck < 30000) return; // Check every 30 seconds
  lastFoodCheck = millis();

  float currentWeight = scale.get_units(3);
  bool foodLevelOk = (currentWeight >= LOW_FOOD_THRESHOLD);
  
  // Only print and send telemetry when status changes
  if (foodLevelOk != lastFoodLevelOk) {
    if (!foodLevelOk) {
      Serial.printf("[FOOD] ! ALERT: Food level LOW (%.2f g) - Please refill !\n", currentWeight);
      Serial.println("[FOOD] Sending instant telemetry update...");
    } else {
      Serial.println("[FOOD] Food hopper refilled");
      Serial.println("[FOOD] Sending instant telemetry update...");
    }
    lastFoodLevelOk = foodLevelOk;
    
    // Send telemetry immediately when food level changes
    sendTelemetry();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
void printStatus() {
  Serial.println("=== SYSTEM STATUS ===");
  
  // WiFi status
  Serial.printf("WiFi: %s", wifiConnected ? "Connected" : "Disconnected");
  if (wifiConnected) {
    Serial.printf(" (%s, RSSI: %d dBm)\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println();
  }
  
  // MQTT status
  Serial.printf("MQTT: %s\n", mqttConnected ? "Connected to Mosquitto" : "Disconnected");
  
  // Food weight
  float foodWeight = scale.get_units(3);
  Serial.printf("Food Weight: %.2f g\n", foodWeight);
  
  // Water level
  if (BYPASS_WATER_LEVEL_SENSOR) {
    Serial.println("Water Level: BYPASSED (no sensor)");
  } else {
    bool waterEmpty = (digitalRead(PIN_WATER_LEVEL) == HIGH);
    Serial.printf("Water Level: %s\n", waterEmpty ? "EMPTY" : "OK");
  }
  
  // Rain status
  if (BYPASS_RAIN_SENSOR) {
    Serial.println("Rain Sensor: BYPASSED (forced DRY)");
  } else {
    int rainValue = analogRead(PIN_RAIN_ANALOG);
    Serial.printf("Rain Sensor: %d (%s)\n", rainValue, 
                  rainValue < RAIN_WET_THRESHOLD ? "RAINING" : "DRY");
  }
  
  Serial.printf("Firmware: v%s\n", FIRMWARE_VERSION);
  Serial.println("====================\n");
} 