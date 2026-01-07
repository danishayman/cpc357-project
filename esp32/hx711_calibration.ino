/*
 * HX711 Load Cell Calibration Sketch
 * 
 * This sketch helps you find the calibration factor for your HX711 load cell.
 * 
 * INSTRUCTIONS:
 * 1. Upload this sketch to your ESP32
 * 2. Open Serial Monitor at 115200 baud
 * 3. Remove all weight from the load cell and press 't' to tare
 * 4. Place a known weight on the load cell (e.g., 100g, 500g, 1kg)
 * 5. Adjust calibration factor by sending:
 *    - '+' to increase calibration factor by 10
 *    - '-' to decrease calibration factor by 10
 *    - 'a' to increase by 100
 *    - 'z' to decrease by 100
 * 6. Keep adjusting until the reading matches your known weight
 * 7. Note down the final calibration factor for use in your main sketch
 * 
 * WIRING:
 * HX711 DT  -> GPIO 16 (or your preferred pin)
 * HX711 SCK -> GPIO 4  (or your preferred pin)
 * HX711 VCC -> 3.3V or 5V
 * HX711 GND -> GND
 */

#include "HX711.h"

// HX711 circuit wiring
const int LOADCELL_DOUT_PIN = 16;  // Change to match your wiring
const int LOADCELL_SCK_PIN = 4;    // Change to match your wiring

HX711 scale;

float calibration_factor = 2280;  // Starting calibration factor
float known_weight = 0;            // Weight currently on the scale (for reference)

void setup() {
  Serial.begin(115200);
  
  Serial.println("\n\n=================================");
  Serial.println("HX711 Calibration Sketch");
  Serial.println("=================================\n");
  
  Serial.println("Initializing scale...");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  if (scale.wait_ready_timeout(1000)) {
    Serial.println("Scale initialized successfully!");
  } else {
    Serial.println("ERROR: HX711 not found.");
    Serial.println("Check wiring:");
    Serial.println("  DT  -> GPIO " + String(LOADCELL_DOUT_PIN));
    Serial.println("  SCK -> GPIO " + String(LOADCELL_SCK_PIN));
    while (1);
  }
  
  scale.set_scale(calibration_factor);
  scale.tare();  // Reset the scale to 0
  
  Serial.println("\nCalibration started!");
  Serial.println("Current calibration factor: " + String(calibration_factor));
  Serial.println("\nCOMMANDS:");
  Serial.println("  t - Tare (reset to zero)");
  Serial.println("  + - Increase calibration by 10");
  Serial.println("  - - Decrease calibration by 10");
  Serial.println("  a - Increase calibration by 100");
  Serial.println("  z - Decrease calibration by 100");
  Serial.println("  w - Set known weight value");
  Serial.println("\n=================================\n");
  
  delay(1000);
}

void loop() {
  // Check for serial commands
  if (Serial.available()) {
    char command = Serial.read();
    handleCommand(command);
  }
  
  // Display current reading
  if (scale.wait_ready_timeout(200)) {
    float reading = scale.get_units(10);  // Average of 10 readings
    
    Serial.print("Reading: ");
    Serial.print(reading, 2);
    Serial.print(" g");
    
    if (known_weight > 0) {
      float error = reading - known_weight;
      float error_percent = (error / known_weight) * 100;
      Serial.print("  |  Expected: ");
      Serial.print(known_weight, 2);
      Serial.print(" g  |  Error: ");
      Serial.print(error, 2);
      Serial.print(" g (");
      Serial.print(error_percent, 1);
      Serial.print("%)");
    }
    
    Serial.print("  |  Cal Factor: ");
    Serial.println(calibration_factor, 0);
    
    delay(500);
  }
}

void handleCommand(char command) {
  switch (command) {
    case 't':
    case 'T':
      Serial.println("\n>>> Taring scale (resetting to zero)...");
      scale.tare();
      Serial.println(">>> Scale tared!\n");
      break;
      
    case '+':
      calibration_factor += 10;
      scale.set_scale(calibration_factor);
      Serial.println("\n>>> Calibration factor increased to: " + String(calibration_factor) + "\n");
      break;
      
    case '-':
      calibration_factor -= 10;
      scale.set_scale(calibration_factor);
      Serial.println("\n>>> Calibration factor decreased to: " + String(calibration_factor) + "\n");
      break;
      
    case 'a':
    case 'A':
      calibration_factor += 100;
      scale.set_scale(calibration_factor);
      Serial.println("\n>>> Calibration factor increased to: " + String(calibration_factor) + "\n");
      break;
      
    case 'z':
    case 'Z':
      calibration_factor -= 100;
      scale.set_scale(calibration_factor);
      Serial.println("\n>>> Calibration factor decreased to: " + String(calibration_factor) + "\n");
      break;
      
    case 'w':
    case 'W':
      Serial.println("\n>>> Enter known weight in grams (e.g., 100, 500, 1000):");
      while (!Serial.available()) {
        delay(10);
      }
      known_weight = Serial.parseFloat();
      Serial.println(">>> Known weight set to: " + String(known_weight) + " g\n");
      break;
      
    case '\n':
    case '\r':
      // Ignore newlines
      break;
      
    default:
      Serial.println("\n>>> Unknown command: " + String(command));
      Serial.println(">>> Use: t (tare), +/- (adjust by 10), a/z (adjust by 100), w (set known weight)\n");
      break;
  }
}
