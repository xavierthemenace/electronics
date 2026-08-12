import type { Lesson } from '../../types'
import { text, codeSample, callout, interactive } from '../helpers'

export const sensorsActuatorsLessons: Lesson[] = [
  {
    slug: 'sensors-fundamentals',
    unitSlug: 'sensors-actuators',
    title: 'How Sensors Actually Work',
    summary:
      'Understand sensors, transducers, analog and digital outputs, ranges, resolution, accuracy, calibration, noise, and datasheets.',
    estimatedMinutes: 50,
    xpReward: 85,
    blocks: [
      text(
        'A **sensor** converts a physical quantity into an electrical signal that a microcontroller can measure or interpret.'
      ),
      text(
        'Examples include temperature sensors, light sensors, pressure sensors, accelerometers, magnetic sensors, distance sensors, and humidity sensors.'
      ),
      text(
        'A sensor may provide an **analog voltage**, a digital signal, or data over a protocol such as I²C, SPI, or UART.'
      ),
      text(
        'Do not confuse **resolution, accuracy, precision, range, and noise**. They describe different properties of a measurement system.'
      ),
      text(
        '**Range** describes the values the sensor can measure. **Resolution** describes the smallest change represented by the measurement system. **Accuracy** describes closeness to the true value. **Precision/repeatability** describes consistency. **Noise** is unwanted variation.'
      ),
      text(
        'The datasheet is the authority for electrical limits, operating voltage, measurement range, timing, communication protocol, and recommended circuit.'
      ),
      text(
        'Common Arduino sensor categories include analog temperature sensors, thermistors, photoresistors, ultrasonic distance sensors, PIR motion sensors, and digital I²C/SPI sensors.'
      ),
      text(
        'Before writing code for a sensor, answer five questions: **What does it measure? What electrical signal does it produce? What voltage does it require? What range does it support? How is its output converted into a physical unit?**'
      ),
      callout(
        'warning',
        'A sensor breakout board and the raw sensor chip are not necessarily electrically equivalent. A breakout may include regulators, level shifting, pull-ups, filters, or other circuitry.'
      ),
      callout(
        'tip',
        'Read the datasheet before wiring unfamiliar hardware. A few minutes of reading can prevent damaged components and hours of debugging.'
      ),
    ],
    practiceProblemSlugs: ['arduino-sensors-fundamentals-1'],
    quizProblemSlugs: ['arduino-sensors-fundamentals-q1'],
  },

  {
    slug: 'sensor-reading-calibration',
    unitSlug: 'sensors-actuators',
    title: 'Reading, Calibrating, and Filtering Sensors',
    summary:
      'Convert raw sensor readings into meaningful values and reduce noise with calibration, averaging, median filters, and sensible sampling.',
    estimatedMinutes: 55,
    xpReward: 90,
    blocks: [
      text(
        'A raw ADC value is rarely the final quantity your application needs. A temperature application wants degrees, a distance application wants centimeters, and a light application may want a calibrated brightness value.'
      ),
      text(
        '**Calibration** establishes the relationship between the sensor’s raw output and the physical quantity you care about.'
      ),
      text(
        'A simple sensor can sometimes be modeled with a linear relationship such as `physicalValue = slope × raw + offset`.'
      ),
      codeSample(
        'cpp',
        `float convertTemperature(int raw)
{
    // Example coefficients only.
    const float slope = 0.488;
    const float offset = -50.0;

    return slope * raw + offset;
}`
      ),
      text(
        'Never use example coefficients as though they were universal. Real coefficients come from the sensor datasheet or your calibration procedure.'
      ),
      text(
        'Measurements can contain noise. A **moving average** reduces random variation by averaging recent samples.'
      ),
      codeSample(
        'cpp',
        `const int N = 10;
int samples[N];
int index = 0;

float average = 0;

void updateAverage(int value)
{
    samples[index] = value;
    index = (index + 1) % N;

    long sum = 0;

    for (int i = 0; i < N; i++) {
        sum += samples[i];
    }

    average = (float)sum / N;
}`
      ),
      text(
        'A moving average smooths data but introduces delay and requires memory. A **median filter** can be better when occasional readings are extreme outliers.'
      ),
      text(
        'More advanced systems may use low-pass filters, complementary filters, or Kalman filters. Do not use a sophisticated filter simply because it sounds advanced; understand the noise model and the requirements first.'
      ),
      text(
        'Sampling rate matters too. Sampling too slowly can miss events. Sampling too quickly can waste processing time, amplify noise, or violate a sensor’s recommended timing.'
      ),
      callout(
        'tip',
        'Graph raw sensor data before designing a filter. You cannot intelligently filter a signal you have never examined.'
      ),
    ],
    practiceProblemSlugs: ['arduino-sensors-1', 'arduino-sensors-2'],
    quizProblemSlugs: ['arduino-sensors-q1'],
    prerequisites: [
      { lessonSlug: 'sensors-fundamentals', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'distance-motion-sensors',
    unitSlug: 'sensors-actuators',
    title: 'Distance, Motion, and Environmental Sensors',
    summary:
      'Work with ultrasonic distance sensors, PIR sensors, temperature/humidity devices, IMUs, and sensor-specific libraries.',
    estimatedMinutes: 55,
    xpReward: 90,
    blocks: [
      text(
        'Different sensors require different electrical and software techniques. The goal is not to memorize libraries; it is to understand how to read a device from its electrical interface and datasheet.'
      ),
      text(
        '**HC-SR04 ultrasonic sensors** measure distance by transmitting an ultrasonic pulse and measuring the time until an echo returns.'
      ),
      codeSample(
        'cpp',
        `const int TRIG = 9;
const int ECHO = 10;

float readDistanceCm()
{
    digitalWrite(TRIG, LOW);
    delayMicroseconds(2);

    digitalWrite(TRIG, HIGH);
    delayMicroseconds(10);

    digitalWrite(TRIG, LOW);

    unsigned long duration = pulseIn(ECHO, HIGH, 30000);

    if (duration == 0) {
        return -1.0;
    }

    return duration * 0.0343 / 2.0;
}`
      ),
      text(
        'The timeout in `pulseIn` is important: without a timeout, a missing echo can cause the function to wait unnecessarily.'
      ),
      text(
        '**PIR sensors** detect changes in infrared radiation associated with movement. They are not general-purpose distance sensors.'
      ),
      text(
        'Temperature and humidity sensors may use proprietary timing protocols or buses such as I²C or 1-Wire. Many have libraries that hide the low-level details.'
      ),
      text(
        'An **IMU** combines sensors such as an accelerometer and gyroscope. Orientation estimation usually requires calibration and sensor fusion rather than simply reading one register.'
      ),
      text(
        'When using a library, understand what the library is doing: what bus does it use, what address does the device have, what units are returned, and what errors can occur?'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          { type: 'ultrasonic', trigPin: 9, echoPin: 10 },
          { type: 'led', pin: 13, color: 'red' },
        ],
        code:
          'const int TRIG=9, ECHO=10, LED=13; void setup() { pinMode(TRIG,OUTPUT); pinMode(ECHO,INPUT); pinMode(LED,OUTPUT); Serial.begin(9600); } void loop() { digitalWrite(TRIG,LOW); delayMicroseconds(2); digitalWrite(TRIG,HIGH); delayMicroseconds(10); digitalWrite(TRIG,LOW); long d=pulseIn(ECHO,HIGH,30000); if(d==0){Serial.println("No echo");} else {float cm=d*0.0343/2; digitalWrite(LED,cm<20); Serial.println(cm);} delay(100); }',
      }),
      callout(
        'warning',
        'Sensor libraries do not eliminate electrical requirements. Verify supply voltage, logic levels, pull-ups, wiring, warm-up time, and operating limits before connecting a sensor.'
      ),
    ],
    practiceProblemSlugs: ['arduino-sensors-3', 'arduino-sensors-4'],
    quizProblemSlugs: ['arduino-sensors-q2'],
    prerequisites: [
      { lessonSlug: 'sensor-reading-calibration', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'transistors-drivers',
    unitSlug: 'sensors-actuators',
    title: 'Driving Real Hardware: Transistors, Relays, and Power Loads',
    summary:
      'Learn why GPIO pins cannot directly drive large loads and how transistors, MOSFETs, flyback protection, and drivers solve the problem.',
    estimatedMinutes: 55,
    xpReward: 95,
    blocks: [
      text(
        'A GPIO pin is a control signal. Many real-world loads require more current or a different voltage than the microcontroller can provide.'
      ),
      text(
        'A **transistor** can act as an electronically controlled switch. A microcontroller output controls the transistor while a separate power supply provides the load current.'
      ),
      text(
        'A common low-side switching circuit uses an N-channel MOSFET.'
      ),
      codeSample(
        'text',
        `External +V
    |
   LOAD
    |
   DRAIN
   MOSFET
   SOURCE
    |
   GND

Arduino GPIO -> GATE`
      ),
      text(
        'The MOSFET must be selected according to voltage, current, gate-drive requirements, heat dissipation, and switching conditions. A part being labeled “logic level” does not automatically mean every microcontroller voltage drives it efficiently.'
      ),
      text(
        'Inductive loads such as motors, relays, and solenoids can generate a voltage spike when current is interrupted. A **flyback diode** is commonly used across suitable DC inductive loads to provide a safe path for that current.'
      ),
      text(
        'A relay module may already contain a transistor driver and flyback protection. Again, inspect the module documentation rather than assuming.'
      ),
      callout(
        'warning',
        'Never connect a motor, solenoid, relay coil, or other high-current load directly to an Arduino GPIO pin unless the component and board specifications explicitly permit it. Use an appropriate driver stage and power supply.'
      ),
      text(
        'This is the point where Arduino programming becomes real embedded engineering: you must design both the **software control path** and the **electrical power path**.'
      ),
    ],
    practiceProblemSlugs: ['arduino-drivers-1', 'arduino-drivers-2'],
    quizProblemSlugs: ['arduino-drivers-q1'],
    prerequisites: [
      { lessonSlug: 'distance-motion-sensors', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'motors',
    unitSlug: 'sensors-actuators',
    title: 'Motors: DC, Servo, and Stepper Control',
    summary:
      'Understand motor types, external power, H-bridges, PWM speed control, servo positioning, stepper drivers, and acceleration.',
    estimatedMinutes: 60,
    xpReward: 100,
    blocks: [
      text(
        'Motors convert electrical energy into mechanical motion. Different motor types require different control strategies.'
      ),
      text(
        '**DC motors** are simple rotating motors. Their speed can often be controlled with PWM, while an H-bridge can control direction.'
      ),
      text(
        'Common motor-driver families include TB6612FNG, DRV8833, and other H-bridge drivers. Choose the driver based on the motor’s voltage, stall current, and required control mode.'
      ),
      codeSample(
        'cpp',
        `const int EN = 9;
const int IN1 = 7;
const int IN2 = 8;

void setMotor(int speed)
{
    speed = constrain(speed, -255, 255);

    if (speed > 0) {
        digitalWrite(IN1, HIGH);
        digitalWrite(IN2, LOW);
    }
    else if (speed < 0) {
        digitalWrite(IN1, LOW);
        digitalWrite(IN2, HIGH);
    }
    else {
        digitalWrite(IN1, LOW);
        digitalWrite(IN2, LOW);
    }

    analogWrite(EN, abs(speed));
}`
      ),
      text(
        '**Servos** contain control electronics and a motor mechanism. Many hobby servos accept a pulse-based position command and are commonly controlled with the Arduino Servo library.'
      ),
      codeSample(
        'cpp',
        `#include <Servo.h>

Servo arm;

void setup()
{
    arm.attach(9);
    arm.write(90);
}

void loop() {}`
      ),
      text(
        'Do not assume a servo can be powered safely from the Arduino’s 5 V pin. Servo current can be substantial, especially during startup or when mechanically loaded.'
      ),
      text(
        '**Stepper motors** divide rotation into discrete steps. A stepper driver such as an A4988 or DRV8825 commonly exposes STEP and DIR inputs.'
      ),
      codeSample(
        'cpp',
        `const int STEP = 2;
const int DIR = 3;

void setup()
{
    pinMode(STEP, OUTPUT);
    pinMode(DIR, OUTPUT);

    digitalWrite(DIR, HIGH);
}

void loop()
{
    digitalWrite(STEP, HIGH);
    delayMicroseconds(500);

    digitalWrite(STEP, LOW);
    delayMicroseconds(500);
}`
      ),
      text(
        'Real motion systems require more than “move N steps.” Acceleration, deceleration, missed steps, mechanical load, current limiting, end stops, and homing all matter.'
      ),
      callout(
        'warning',
        'Motors should normally use an appropriate external power source and driver. Connect grounds as required by the driver/control design, and verify the driver’s voltage and current limits.'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          {
            type: 'dc-motor',
            driver: 'L298N',
            pins: { ena: 9, in1: 7, in2: 8 },
          },
          { type: 'servo', pin: 10 },
        ],
        code:
          'const int ENA=9, IN1=7, IN2=8; #include <Servo.h> Servo s; void setup() { pinMode(ENA,OUTPUT); pinMode(IN1,OUTPUT); pinMode(IN2,OUTPUT); s.attach(10); } void loop() { analogWrite(ENA,128); digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW); s.write(90); delay(1000); }',
      }),
    ],
    practiceProblemSlugs: ['arduino-motors-1', 'arduino-motors-2'],
    quizProblemSlugs: ['arduino-motors-q1', 'arduino-motors-q2'],
    prerequisites: [
      { lessonSlug: 'transistors-drivers', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'displays',
    unitSlug: 'sensors-actuators',
    title: 'Displays: LCD, OLED, and TFT',
    summary:
      'Control character LCDs, I²C OLEDs, and SPI TFT displays while learning how display libraries, framebuffers, buses, and graphics work.',
    estimatedMinutes: 50,
    xpReward: 90,
    blocks: [
      text(
        'A display is an output device, but it also demonstrates an important embedded concept: **limited memory and bandwidth**.'
      ),
      text(
        'A character LCD such as an HD44780-based 16×2 display represents text using a character grid. Many modules add an I²C backpack so the Arduino needs fewer GPIO connections.'
      ),
      codeSample(
        'cpp',
        `#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup()
{
    lcd.init();
    lcd.backlight();

    lcd.setCursor(0, 0);
    lcd.print("Hello Arduino!");
}

void loop() {}`
      ),
      text(
        'An I²C address such as `0x27` is not universal. Your particular module may use another address.'
      ),
      text(
        'OLED displays such as SSD1306-based modules commonly communicate over I²C or SPI and are often controlled through graphics libraries.'
      ),
      codeSample(
        'cpp',
        `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire);

void setup()
{
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Hello!");
    display.display();
}

void loop() {}`
      ),
      text(
        'Many graphics displays use a **framebuffer**: the program builds an image in memory and then transfers it to the display. This can consume substantial RAM on small microcontrollers.'
      ),
      text(
        'Color TFT displays often use SPI because transferring many pixels benefits from higher bandwidth. Libraries such as Adafruit GFX provide common drawing abstractions.'
      ),
      callout(
        'tip',
        'Before using a display library, understand its requirements: bus type, address or chip-select pin, reset pin, voltage, RAM usage, and initialization sequence.'
      ),
    ],
    practiceProblemSlugs: ['arduino-displays-1', 'arduino-displays-2'],
    quizProblemSlugs: ['arduino-displays-q1'],
    prerequisites: [{ lessonSlug: 'i2c', minMasteryScore: 70 }],
  },

  {
    slug: 'libraries-datasheets',
    unitSlug: 'sensors-actuators',
    title: 'Libraries, Datasheets, and Building from Documentation',
    summary:
      'Learn how to select libraries, read datasheets, inspect examples, understand dependencies, and work with unfamiliar hardware independently.',
    estimatedMinutes: 45,
    xpReward: 85,
    blocks: [
      text(
        'Mastering Arduino does not mean memorizing every sensor or library. It means being able to approach unfamiliar hardware systematically.'
      ),
      text(
        'A **library** packages reusable code. It may provide a high-level API while handling register operations, communication protocols, calibration, or timing internally.'
      ),
      text(
        'When evaluating a library, check who maintains it, which boards it supports, what dependencies it has, and whether its API matches your device.'
      ),
      text(
        'A **datasheet** describes the actual component. Important sections include absolute maximum ratings, recommended operating conditions, pin descriptions, electrical characteristics, timing diagrams, communication protocols, and example circuits.'
      ),
      text(
        '**Absolute maximum ratings are not recommended operating conditions.** A value listed as an absolute maximum is a boundary that should not be treated as a normal operating target.'
      ),
      text(
        'A good workflow for unfamiliar hardware is: identify the exact part → read the electrical requirements → identify the interface → wire power and ground → verify the bus/address/pins → run the simplest library example → print raw data → build your application.'
      ),
      callout(
        'tip',
        'The fastest Arduino programmers are usually not the people who memorize the most APIs. They are the people who can quickly extract the important information from a datasheet.'
      ),
    ],
    practiceProblemSlugs: ['arduino-libraries-1'],
    quizProblemSlugs: ['arduino-libraries-q1'],
    prerequisites: [{ lessonSlug: 'displays', minMasteryScore: 70 }],
  },


  {
    slug: 'analog-signal-conditioning',
    unitSlug: 'sensors-actuators',
    title: 'Analog Signal Conditioning: Op-Amps, Filters, and ADC Front Ends',
    summary:
      'Learn how real sensors become clean measurable signals using voltage dividers, op-amps, buffers, gain stages, filters, protection, reference design, and ADC-aware layout.',
    estimatedMinutes: 95,
    xpReward: 145,
    blocks: [
      text(
        'A sensor output is often not directly suitable for an ADC. Signal conditioning converts a weak, noisy, high-impedance, or inconvenient signal into a form the measurement system can use.'
      ),
      text(
        'Master the voltage divider first, including its output impedance and loading. Then learn why a **buffer** can isolate a sensor from a low-impedance ADC input or downstream load.'
      ),
      text(
        'Learn ideal op-amp assumptions, negative feedback, voltage followers, inverting and non-inverting amplifiers, summing, differential measurement, and the limits imposed by supply rails, input common-mode range, output swing, bandwidth, offset, and noise.'
      ),
      text(
        'Design first-order RC low-pass and high-pass filters and understand cutoff frequency, attenuation, phase shift, and the tradeoff between smoothing and response time.'
      ),
      text(
        'Add ADC protection concepts: series resistance, clamps where appropriate, input overvoltage limits, anti-alias filtering, reference stability, source impedance, and grounding.'
      ),
      text(
        'Learn **aliasing**: sampling a signal too slowly can make a higher-frequency signal appear as a false lower-frequency signal. An anti-alias filter is an analog system requirement, not merely a software setting.'
      ),
      text(
        'Build a complete measurement chain on paper: physical quantity → sensor → bias/bridge → amplifier → filter → protection → ADC → calibration → engineering units.'
      ),
      callout(
        'tip',
        'Do not ask only “What sensor should I buy?” Ask “What measurement chain gives me the accuracy, bandwidth, range, noise performance, and electrical compatibility I need?”'
      ),
    ],
    practiceProblemSlugs: ['signal-conditioning-1', 'signal-conditioning-2', 'signal-conditioning-3'],
    quizProblemSlugs: ['signal-conditioning-q1', 'signal-conditioning-q2'],
    prerequisites: [{ lessonSlug: 'sensor-reading-calibration', minMasteryScore: 70 }],
  },

  {
    slug: 'adc-dac-measurement',
    unitSlug: 'sensors-actuators',
    title: 'ADC, DAC, References, and Precision Measurement',
    summary:
      'Understand quantization, sampling, reference voltage, effective resolution, DACs, ratiometric measurement, error budgets, and precision instrumentation.',
    estimatedMinutes: 90,
    xpReward: 140,
    blocks: [
      text(
        'An ADC converts a continuous voltage into a finite digital code. Mastering ADCs requires understanding more than the number of bits.'
      ),
      text(
        'Learn quantization step size, full-scale range, code mapping, reference voltage, gain error, offset error, nonlinearity, noise, effective number of bits, and input impedance.'
      ),
      text(
        'Distinguish **resolution**, **accuracy**, **precision**, **repeatability**, **noise**, and **stability**. A 16-bit ADC is not automatically a 16-bit accurate measurement instrument.'
      ),
      text(
        'Study sampling rate, aperture concepts, aliasing, anti-alias filtering, sample-and-hold behavior, and the settling requirements imposed by the ADC input network.'
      ),
      text(
        'Learn why **ratiometric measurements** can reject supply variation when both the sensor excitation and ADC reference share the same source.'
      ),
      text(
        'Understand DACs as the reverse problem: generating an analog output from a digital code. Explore PWM-as-a-DAC, resistor networks, and dedicated DACs, including filtering requirements.'
      ),
      text(
        'Finish with an **error budget**: list every meaningful source of uncertainty, estimate its magnitude, and determine whether the design actually meets the required measurement specification.'
      ),
      callout(
        'tip',
        'A measurement specification should include range, resolution, accuracy, bandwidth, update rate, latency, environmental conditions, and acceptable failure behavior.'
      ),
    ],
    practiceProblemSlugs: ['adc-dac-1', 'adc-dac-2', 'adc-dac-3'],
    quizProblemSlugs: ['adc-dac-q1', 'adc-dac-q2'],
    prerequisites: [{ lessonSlug: 'analog-signal-conditioning', minMasteryScore: 70 }],
  },

  {
    slug: 'power-electronics',
    unitSlug: 'sensors-actuators',
    title: 'Power Electronics: Regulators, Batteries, and Protection',
    summary:
      'Design practical power paths using linear regulators, buck/boost converters, decoupling, current limits, thermal analysis, batteries, fuses, and transient protection.',
    estimatedMinutes: 100,
    xpReward: 150,
    blocks: [
      text(
        'Every embedded system has a power architecture. A reliable design begins by treating power as a first-class subsystem rather than an afterthought.'
      ),
      text(
        'Learn the difference between **linear regulators** and **switching regulators**. Calculate linear-regulator dissipation with P ≈ (V_in − V_out) × I and understand why efficiency and heat can make a switching regulator preferable.'
      ),
      text(
        'Study buck, boost, and buck-boost converter concepts, switching frequency, inductors, capacitors, feedback, ripple, efficiency, transient response, and layout sensitivity.'
      ),
      text(
        'Understand regulator dropout, quiescent current, startup behavior, current limiting, thermal shutdown, reverse-current behavior, and stability requirements.'
      ),
      text(
        'Learn battery terminology: nominal voltage, charge/discharge limits, capacity, energy, internal resistance, discharge rate, state of charge, and protection circuitry. Match the battery to the load profile rather than its nominal voltage alone.'
      ),
      text(
        'Add protection: fuses, current limiting, reverse-polarity protection, TVS devices, ESD protection, thermal protection, brownout handling, and safe connector design.'
      ),
      text(
        'Perform a power budget with active, idle, sleep, radio, sensor, and motor states. Then design the supply around worst-case current and transient requirements, not average current alone.'
      ),
      callout(
        'warning',
        'Do not connect batteries, regulators, motors, or other power sources by nominal voltage alone. Verify polarity, current capability, transient behavior, thermal limits, and protection requirements.'
      ),
    ],
    practiceProblemSlugs: ['power-electronics-1', 'power-electronics-2', 'power-electronics-3'],
    quizProblemSlugs: ['power-electronics-q1', 'power-electronics-q2'],
    prerequisites: [{ lessonSlug: 'diodes-transistors-basics', minMasteryScore: 70 }],
  },

  {
    slug: 'motion-control-feedback',
    unitSlug: 'sensors-actuators',
    title: 'Feedback and Motion Control',
    summary:
      'Connect sensors to actuators through feedback loops, PID control, encoder measurement, setpoints, stability, response time, saturation, and practical tuning.',
    estimatedMinutes: 100,
    xpReward: 150,
    blocks: [
      text(
        'A motor that simply receives a command is open-loop. A system that measures its output and corrects the command is a **closed-loop control system**.'
      ),
      text(
        'Learn the vocabulary of control: setpoint, measured value, error, controller, plant, actuator, sensor, disturbance, feedback, saturation, and steady-state error.'
      ),
      text(
        'Start with proportional control: output = Kp × error. Then understand why integral action removes persistent error and why derivative action can improve response but is sensitive to noise.'
      ),
      text(
        'Study the practical **PID controller**, including output limits, anti-windup, derivative filtering, sample time, manual/automatic mode, and safe startup.'
      ),
      text(
        'Use encoders to measure position or speed. Understand incremental encoder pulses, quadrature, counts per revolution, velocity estimation, and the relationship between mechanical resolution and electrical counting.'
      ),
      text(
        'Introduce stability and step response: overshoot, rise time, settling time, oscillation, and damping. Tune a controller from measurements rather than guessing constants.'
      ),
      text(
        'A real motion system also needs homing, end stops, fault states, current limits, acceleration limits, and a defined behavior when the sensor becomes invalid.'
      ),
      callout(
        'tip',
        'Never tune a control loop before defining what “good performance” means. Write numerical requirements for error, response time, overshoot, and safe limits first.'
      ),
    ],
    practiceProblemSlugs: ['control-1', 'control-2', 'control-3'],
    quizProblemSlugs: ['control-q1', 'control-q2'],
    prerequisites: [{ lessonSlug: 'motors', minMasteryScore: 70 }],
  },
]
