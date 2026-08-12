import type { Lesson } from '../../types'
import { text, codeSample, callout, interactive } from '../helpers'

export const gettingStartedLessons: Lesson[] = [
  {
    slug: 'electronics-fundamentals',
    unitSlug: 'getting-started',
    title: 'Electronics from Zero: Voltage, Current, and Circuits',
    summary:
      'Learn the electrical concepts you need before connecting hardware: voltage, current, resistance, power, ground, Ohm’s law, polarity, and basic circuit safety.',
    estimatedMinutes: 50,
    xpReward: 80,
    blocks: [
      text(
        'Before programming an Arduino, you need a simple mental model of electricity. **Voltage** is electrical potential difference, **current** is the flow of electric charge, and **resistance** describes how strongly a component opposes current.'
      ),
      text(
        'A useful analogy is water: voltage is similar to pressure, current is similar to flow, and resistance is similar to a restriction in the pipe. The analogy is imperfect, but it is useful for developing intuition.'
      ),
      text(
        '**Voltage (V)** is measured between two points. **Current (A)** flows through a circuit. **Resistance (Ω)** limits current.'
      ),
      text(
        'The most important equation at this stage is **Ohm’s law: V = I × R**. Therefore, `I = V / R` and `R = V / I`.'
      ),
      codeSample(
        'text',
        `Example:

A 5 V supply is connected to a 1 kΩ resistor.

I = V / R
I = 5 / 1000
I = 0.005 A
I = 5 mA`
      ),
      text(
        '**Power** describes how quickly electrical energy is transferred. The basic relationship is `P = V × I`. A component that dissipates too much power can become hot or fail.'
      ),
      text(
        '**Ground (GND)** is the reference point used to describe voltage in a circuit. When two Arduino-connected devices communicate electrically, they normally need a common ground reference.'
      ),
      text(
        'A circuit needs a complete path for current to flow. Connecting a power supply directly from its positive terminal to ground with very little resistance can create a **short circuit**, potentially causing excessive current and damage.'
      ),
      text(
        '**Polarity matters.** LEDs, electrolytic capacitors, diodes, sensors, and many modules have terminals that must be connected in the correct orientation.'
      ),
      callout(
        'warning',
        'Never assume that an Arduino pin can safely power an arbitrary component. Check the component’s voltage and current requirements, and use an appropriate driver or external power supply when necessary.'
      ),
      text(
        'For an LED, a series resistor is normally required to limit current.'
      ),
      codeSample(
        'text',
        `5 V Arduino output
      |
     [220 Ω]
      |
     |>|  LED
      |
     GND`
      ),
      text(
        'A resistor can be used to choose a safe LED current. For example, if an LED drops about 2 V and the Arduino output is approximately 5 V, a 220 Ω resistor gives roughly `(5 - 2) / 220 ≈ 14 mA` under idealized assumptions.'
      ),
      text(
        'You do not need to memorize every circuit equation yet. Your first goal is to understand the relationship between **source voltage, current, resistance, power, and a complete circuit**.'
      ),
      text(
        '**Safety habit:** before powering a circuit, check polarity, supply voltage, connections, and whether any component can draw more current than the Arduino or breadboard supply can provide.'
      ),
      callout(
        'tip',
        'A multimeter is one of the most useful tools you can own. Learn to measure voltage and resistance first. Current measurements require extra care because the meter is inserted into the current path.'
      ),
    ],
    practiceProblemSlugs: [
      'arduino-electronics-1',
      'arduino-electronics-2',
      'arduino-electronics-3',
    ],
    quizProblemSlugs: ['arduino-electronics-q1', 'arduino-electronics-q2'],
  },

  {
    slug: 'arduino-getting-started',
    unitSlug: 'getting-started',
    title: 'What Is Arduino? Boards, Pins, and Your First Sketch',
    summary:
      'Understand microcontrollers, the Arduino ecosystem, the Uno board, sketches, pins, compilation, uploading, and the first program.',
    estimatedMinutes: 40,
    xpReward: 70,
    blocks: [
      text(
        'A **microcontroller (MCU)** is a small computer designed to interact directly with electronics. It contains a processor, memory, and hardware peripherals such as GPIO, timers, ADCs, and communication interfaces.'
      ),
      text(
        '**Arduino** is an ecosystem of development boards, software, libraries, documentation, and conventions that make microcontrollers easier to program.'
      ),
      text(
        'Different Arduino-compatible boards use different microcontrollers. This matters because **Arduino code is not universally identical across boards**. Pin numbers, voltage levels, peripherals, memory, and supported features can differ.'
      ),
      text(
        'In this beginner course, the **Arduino Uno** is the reference board unless a lesson explicitly says otherwise.'
      ),
      text(
        'The classic Uno uses the ATmega328P. It has digital I/O pins, analog input pins, timers, serial communication, and other peripherals.'
      ),
      text(
        '**Digital pins** can be configured as inputs or outputs. **Analog input pins** can measure a voltage using the microcontroller’s ADC. Some digital pins also support hardware features such as PWM, external interrupts, or serial communication.'
      ),
      text(
        'A **sketch** is an Arduino program. It normally contains `setup()` and `loop()`.'
      ),
      codeSample(
        'cpp',
        `void setup()
{
    // Runs once after reset or power-up.
}

void loop()
{
    // Runs repeatedly forever.
}`
      ),
      text(
        '`setup()` is where you normally configure pins, peripherals, and communication. `loop()` contains the repeated behavior of your application.'
      ),
      text(
        'Your first program can control the Arduino’s built-in LED.'
      ),
      codeSample(
        'cpp',
        `void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
}

void loop()
{
    digitalWrite(LED_BUILTIN, HIGH);
    delay(1000);

    digitalWrite(LED_BUILTIN, LOW);
    delay(1000);
}`
      ),
      text(
        '`pinMode` configures a pin. `digitalWrite` changes an output. `HIGH` and `LOW` represent the two digital states. `delay(1000)` pauses for approximately 1000 milliseconds.'
      ),
      text(
        'When you click Upload, the Arduino toolchain compiles your sketch, links it with the Arduino core and libraries, and uploads the resulting firmware to the board.'
      ),
      text(
        'A useful distinction is **programming the microcontroller** versus **building an electronic circuit**. The Arduino program controls electrical signals, but the external circuit determines what those signals actually do.'
      ),
      callout(
        'tip',
        'Always identify your exact board before wiring a circuit. Never assume that a pin number, voltage level, or peripheral works identically on every Arduino-compatible board.'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          { type: 'led', pin: 13, color: 'red' },
        ],
        code:
          'void setup() { pinMode(LED_BUILTIN, OUTPUT); } void loop() { digitalWrite(LED_BUILTIN, HIGH); delay(1000); digitalWrite(LED_BUILTIN, LOW); delay(1000); }',
      }),
    ],
    practiceProblemSlugs: ['arduino-gs-1', 'arduino-gs-2'],
    quizProblemSlugs: ['arduino-gs-q1', 'arduino-gs-q2'],
    prerequisites: [
      { lessonSlug: 'electronics-fundamentals', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'breadboards-circuits',
    unitSlug: 'getting-started',
    title: 'Breadboards, Resistors, LEDs, and Wiring',
    summary:
      'Learn how breadboards work, how to read simple circuit diagrams, and how to safely connect an Arduino to real components.',
    estimatedMinutes: 45,
    xpReward: 75,
    blocks: [
      text(
        'A **breadboard** lets you build temporary circuits without soldering. The holes are electrically connected in specific groups underneath the plastic.'
      ),
      text(
        'On a typical solderless breadboard, groups of five holes are connected internally. The long power rails are commonly used for supply voltage and ground, although the exact rail layout varies by board.'
      ),
      text(
        'Always inspect the actual breadboard. Do not rely on the appearance of the plastic alone.'
      ),
      text(
        'A **resistor** limits current. Resistor values are measured in ohms and may be identified using color bands or printed markings.'
      ),
      text(
        'An **LED** is a diode that emits light. It is polarized: current is intended to flow from the anode toward the cathode. The longer lead is commonly the anode on a new through-hole LED, but physical markings and the component datasheet are more reliable.'
      ),
      text(
        'An LED should normally be driven through a current-limiting resistor.'
      ),
      codeSample(
        'text',
        `Arduino pin
    |
  220 Ω
    |
   LED
    |
   GND`
      ),
      text(
        'The Arduino pin drives the circuit. The resistor limits current. The LED converts electrical energy into light. Ground completes the circuit.'
      ),
      text(
        '**Never connect an LED directly between an Arduino output and ground without an appropriate current-limiting method.**'
      ),
      text(
        'Before powering a breadboard circuit, perform a visual check: Are 5 V and GND accidentally connected? Is the LED oriented correctly? Is the resistor actually in series with the LED? Are jumper wires in the intended breadboard rows?'
      ),
      callout(
        'warning',
        'Arduino pins are signal interfaces, not general-purpose power supplies. A GPIO pin should not be used to drive motors, relays, high-power LEDs, or other loads directly unless the electrical requirements are explicitly within the pin’s specifications.'
      ),
      text(
        'A **schematic** shows electrical relationships. A breadboard layout shows physical placement. Learn to read schematics because they scale much better than photographs of wiring.'
      ),
      callout(
        'tip',
        'When troubleshooting hardware, simplify the circuit. Disconnect everything except the Arduino and one component, verify that it works, and add components back one at a time.'
      ),
    ],
    practiceProblemSlugs: ['arduino-breadboard-1', 'arduino-breadboard-2'],
    quizProblemSlugs: ['arduino-breadboard-q1'],
    prerequisites: [
      { lessonSlug: 'arduino-getting-started', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'digital-io',
    unitSlug: 'getting-started',
    title: 'Digital Input and Output',
    summary:
      'Master GPIO, HIGH and LOW, inputs, outputs, pull-ups, buttons, floating inputs, and reliable button handling.',
    estimatedMinutes: 50,
    xpReward: 80,
    blocks: [
      text(
        '**GPIO** means General-Purpose Input/Output. A GPIO pin can often be configured either to observe an electrical signal or actively drive one.'
      ),
      text(
        'For the Uno, digital logic is associated with LOW and HIGH. HIGH is approximately the board’s logic supply voltage, while LOW is approximately ground. Exact voltage thresholds and output behavior are specified by the microcontroller datasheet.'
      ),
      text(
        'Configure an output with `pinMode(pin, OUTPUT)` and control it with `digitalWrite`.'
      ),
      codeSample(
        'cpp',
        `const int LED = 13;

void setup()
{
    pinMode(LED, OUTPUT);
}

void loop()
{
    digitalWrite(LED, HIGH);
    delay(500);

    digitalWrite(LED, LOW);
    delay(500);
}`
      ),
      text(
        'Configure an input with `INPUT`. An input that is not electrically driven to a defined level can **float**, meaning noise can cause unpredictable readings.'
      ),
      text(
        '`INPUT_PULLUP` enables an internal pull-up resistor. A common button circuit connects the button between the input pin and GND.'
      ),
      codeSample(
        'cpp',
        `const int BUTTON = 2;
const int LED = 13;

void setup()
{
    pinMode(BUTTON, INPUT_PULLUP);
    pinMode(LED, OUTPUT);
}

void loop()
{
    bool pressed = digitalRead(BUTTON) == LOW;
    digitalWrite(LED, pressed);
}`
      ),
      text(
        'This circuit has **active-low logic**: the button is pressed when the pin reads LOW. That is not a bug—the circuit was designed that way.'
      ),
      text(
        'A mechanical button does not transition perfectly from open to closed. Its contacts physically bounce for a short time, potentially producing multiple transitions.'
      ),
      text(
        '**Debouncing** means turning those noisy transitions into one logical button event. A robust beginner technique is a state-based debounce using `millis()` rather than blocking the entire program with `delay()`.'
      ),
      codeSample(
        'cpp',
        `const int BUTTON = 2;

int stableState = HIGH;
int lastReading = HIGH;
unsigned long lastChangeTime = 0;

void setup()
{
    pinMode(BUTTON, INPUT_PULLUP);
}

void loop()
{
    int reading = digitalRead(BUTTON);

    if (reading != lastReading) {
        lastChangeTime = millis();
        lastReading = reading;
    }

    if (millis() - lastChangeTime >= 30) {
        stableState = reading;
    }

    // Use stableState here.
}`
      ),
      callout(
        'warning',
        'Do not connect two actively driven outputs directly together. If one output drives HIGH and another drives LOW, they can fight each other and cause excessive current.'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          { type: 'button', pin: 2, pullup: true },
          { type: 'led', pin: 13, color: 'red' },
        ],
        code:
          'const int BUTTON = 2; const int LED = 13; void setup() { pinMode(BUTTON, INPUT_PULLUP); pinMode(LED, OUTPUT); } void loop() { digitalWrite(LED, digitalRead(BUTTON) == LOW); }',
      }),
    ],
    practiceProblemSlugs: [
      'arduino-dio-1',
      'arduino-dio-2',
      'arduino-dio-3',
    ],
    quizProblemSlugs: ['arduino-dio-q1', 'arduino-dio-q2'],
    prerequisites: [
      { lessonSlug: 'breadboards-circuits', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'analog-pwm',
    unitSlug: 'getting-started',
    title: 'Analog Signals, ADC, and PWM',
    summary:
      'Understand real-world analog voltages, analog-to-digital conversion, ADC resolution, PWM, duty cycle, and voltage measurement.',
    estimatedMinutes: 55,
    xpReward: 85,
    blocks: [
      text(
        'The physical world is largely **analog**. Temperature, light, pressure, and many other quantities vary continuously. A microcontroller, however, works internally with digital numbers.'
      ),
      text(
        'An **ADC (analog-to-digital converter)** measures an input voltage and represents it as a number.'
      ),
      text(
        'On a classic Arduino Uno, `analogRead()` normally returns a value from `0` to `1023`, representing the ADC’s 10-bit range.'
      ),
      codeSample(
        'cpp',
        `int reading = analogRead(A0);

float voltage = reading * (5.0 / 1023.0);

Serial.println(voltage);`
      ),
      text(
        'The exact voltage represented by a reading depends on the ADC reference voltage. Do not blindly assume it is exactly 5.000 V; supply tolerance, reference configuration, and the board all matter.'
      ),
      text(
        '**Resolution is not accuracy.** A 10-bit ADC has 1024 possible codes, but that does not mean every measurement is accurate to one part in 1024.'
      ),
      text(
        '`analogWrite()` on a classic Uno does **PWM**, not true analog voltage. PWM rapidly switches an output between LOW and HIGH. The duty cycle controls the fraction of time the signal is HIGH.'
      ),
      codeSample(
        'text',
        `PWM = 0%   -> always LOW
PWM = 50%  -> HIGH half the time
PWM = 100% -> always HIGH`
      ),
      text(
        'On a classic Uno, `analogWrite()` uses an 8-bit value from `0` to `255`. The available PWM pins are board-specific; on the classic Uno they include 3, 5, 6, 9, 10, and 11.'
      ),
      codeSample(
        'cpp',
        `const int LED = 9;

void setup()
{
    pinMode(LED, OUTPUT);
}

void loop()
{
    for (int brightness = 0; brightness <= 255; brightness++) {
        analogWrite(LED, brightness);
        delay(5);
    }

    for (int brightness = 255; brightness >= 0; brightness--) {
        analogWrite(LED, brightness);
        delay(5);
    }
}`
      ),
      text(
        'A PWM signal can appear like an intermediate brightness to an LED because the human eye integrates the rapidly changing light. With appropriate filtering, PWM can also be converted into a smoother voltage.'
      ),
      text(
        'A potentiometer is an excellent first analog input. It acts as a variable voltage divider and lets you continuously change the voltage presented to an ADC input.'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          { type: 'potentiometer', pin: 'A0' },
          { type: 'led', pin: 9, color: 'blue' },
        ],
        code:
          'void setup() { pinMode(9, OUTPUT); Serial.begin(9600); } void loop() { int value = analogRead(A0); analogWrite(9, value / 4); Serial.println(value); delay(50); }',
      }),
      callout(
        'tip',
        'Whenever you connect a sensor to an analog input, ask: What voltage range does the sensor produce? What voltage range can the ADC safely accept? What reference voltage is being used?'
      ),
    ],
    practiceProblemSlugs: ['arduino-pwm-1', 'arduino-pwm-2', 'arduino-pwm-3'],
    quizProblemSlugs: ['arduino-pwm-q1', 'arduino-pwm-q2'],
    prerequisites: [{ lessonSlug: 'digital-io', minMasteryScore: 70 }],
  },

  {
    slug: 'timing-millis',
    unitSlug: 'getting-started',
    title: 'Time Without Blocking: delay() and millis()',
    summary:
      'Understand Arduino timing, why delay blocks your program, and how to build responsive systems using millis().',
    estimatedMinutes: 45,
    xpReward: 80,
    blocks: [
      text(
        '`delay()` pauses the current Arduino program for a specified number of milliseconds. It is useful for very simple experiments, but during the delay your main program cannot perform other normal work.'
      ),
      text(
        'For example, if you wait five seconds with `delay(5000)`, your program cannot normally respond to a button, update a display, or process another task during that wait.'
      ),
      text(
        '`millis()` returns the number of milliseconds since the Arduino program started. Instead of waiting, record a timestamp and check whether enough time has passed.'
      ),
      codeSample(
        'cpp',
        `const unsigned long INTERVAL = 1000;
unsigned long previousTime = 0;

void loop()
{
    unsigned long now = millis();

    if (now - previousTime >= INTERVAL) {
        previousTime = now;

        // Perform the periodic task.
    }

    // Other work can happen here.
}`
      ),
      text(
        'The subtraction form `now - previousTime >= interval` is preferred because it continues to work correctly when the unsigned `millis()` counter wraps around.'
      ),
      text(
        'This pattern is the foundation of **non-blocking embedded programming**. Instead of saying “wait,” your program says “if it is time, perform the next action.”'
      ),
      text(
        'You can manage several independent activities with the same technique.'
      ),
      codeSample(
        'cpp',
        `unsigned long lastBlink = 0;
unsigned long lastReport = 0;

void loop()
{
    unsigned long now = millis();

    if (now - lastBlink >= 500) {
        lastBlink = now;
        // Toggle LED.
    }

    if (now - lastReport >= 1000) {
        lastReport = now;
        // Print sensor data.
    }

    // Handle buttons and other inputs continuously.
}`
      ),
      callout(
        'tip',
        'Learn `millis()` early. It is one of the most important techniques separating a simple Arduino demo from a responsive embedded application.'
      ),
    ],
    practiceProblemSlugs: ['arduino-timing-1', 'arduino-timing-2'],
    quizProblemSlugs: ['arduino-timing-q1'],
    prerequisites: [{ lessonSlug: 'analog-pwm', minMasteryScore: 70 }],
  },

  {
    slug: 'serial-comm',
    unitSlug: 'communication',
    title: 'Serial Communication and Debugging',
    summary:
      'Understand UART, baud rates, TX/RX, the Serial API, input parsing, and how to use serial output to debug embedded programs.',
    estimatedMinutes: 40,
    xpReward: 70,
    blocks: [
      text(
        '**Serial communication** lets an Arduino exchange a stream of bytes with another device. UART is a common asynchronous serial protocol.'
      ),
      text(
        'At the electrical/protocol level, UART communication commonly uses TX (transmit), RX (receive), and a shared ground. One device’s TX connects to the other device’s RX.'
      ),
      text(
        '**Baud rate** describes the signaling rate. Both sides need compatible serial settings.'
      ),
      text(
        'On a classic Uno, the hardware UART is associated with digital pins 0 (RX) and 1 (TX), and the same hardware serial interface is connected to the USB interface used by the Serial Monitor.'
      ),
      codeSample(
        'cpp',
        `void setup()
{
    Serial.begin(9600);
}

void loop()
{
    Serial.println("Arduino is running");
    delay(1000);
}`
      ),
      text(
        '`Serial.print()` writes without automatically adding a newline. `Serial.println()` adds a line ending.'
      ),
      text(
        'A serial terminal can also send bytes to the Arduino. Check `Serial.available()` before reading.'
      ),
      codeSample(
        'cpp',
        `void loop()
{
    if (Serial.available() > 0) {
        char c = Serial.read();

        Serial.print("Received: ");
        Serial.println(c);
    }
}`
      ),
      text(
        'Serial data is ultimately a sequence of bytes. More advanced applications therefore define a **message format** rather than assuming one call to `Serial.read()` represents one complete command.'
      ),
      text(
        'Functions such as `parseInt()` can be convenient for experiments, but they can introduce blocking behavior and timeout-related surprises. For robust applications, explicit buffering and parsing are often better.'
      ),
      callout(
        'tip',
        'Serial output is one of your most important debugging tools. Print state changes, sensor values, timing information, and error conditions while developing—but remove or reduce excessive logging in timing-sensitive final firmware.'
      ),
      callout(
        'warning',
        'Never connect serial signals without checking voltage compatibility. A 5 V UART signal and a 3.3 V-only input are not automatically safe to connect directly.'
      ),
    ],
    practiceProblemSlugs: ['arduino-serial-1', 'arduino-serial-2'],
    quizProblemSlugs: ['arduino-serial-q1', 'arduino-serial-q2'],
    prerequisites: [{ lessonSlug: 'timing-millis', minMasteryScore: 70 }],
  },


  {
    slug: 'electronics-tools-safety',
    unitSlug: 'getting-started',
    title: 'Electronics Workshop: Safety, Tools, and Measurement',
    summary:
      'Build professional bench habits with multimeters, oscilloscopes, logic analyzers, power supplies, soldering tools, current limiting, ESD precautions, and systematic measurement.',
    estimatedMinutes: 75,
    xpReward: 110,
    blocks: [
      text(
        'Electronics mastery begins with measurement. Before changing a circuit, learn to observe what the circuit is actually doing.'
      ),
      text(
        'Learn the difference between **voltage measurement**, **current measurement**, **resistance/continuity measurement**, and observing a time-varying signal. A voltmeter is normally connected across two points; an ammeter is inserted into the current path.'
      ),
      text(
        'A bench power supply should be treated as a controlled energy source. Learn current limiting, voltage adjustment, output-enable behavior, and why a current limit is a protection feature rather than a guarantee that a circuit is safe.'
      ),
      text(
        'An **oscilloscope** shows voltage versus time and lets you investigate ripple, switching edges, PWM, noise, ringing, and timing. A **logic analyzer** is especially useful for digital buses such as UART, I²C, and SPI.'
      ),
      text(
        'Probe technique matters. Ground leads, bandwidth, probe loading, and grounding inductance can change what you observe. A measurement is part of the circuit, not an invisible observer.'
      ),
      text(
        'Learn workshop safety: inspect cables, avoid exposed mains voltage while learning, discharge capacitors appropriately, use current limiting, respect component ratings, and never work on an energized circuit unless the procedure explicitly requires it and you understand the hazards.'
      ),
      text(
        'Add **ESD awareness**: static discharge can damage semiconductors without producing an obvious visible failure. Use appropriate handling, storage, and grounding practices.'
      ),
      text(
        'Your diagnostic sequence should become automatic: **visual inspection → polarity → supply voltage → current draw → ground/reference → expected signal → measured signal → component isolation → software**.'
      ),
      interactive('circuit-sim', {
        board: 'uno',
        components: [
          { type: 'led', pin: 13, color: 'red' },
        ],
        code:
          'void setup() { pinMode(13, OUTPUT); } void loop() { digitalWrite(13,HIGH); delay(500); digitalWrite(13,LOW); delay(500); }',
      }),
      callout(
        'warning',
        'Never measure current by placing a multimeter configured for current directly across a power supply. That can create a near-short circuit and damage the meter, supply, or wiring.'
      ),
      callout(
        'tip',
        'Keep a measurement log: expected value, measured value, instrument, test point, operating condition, and conclusion. This turns debugging into engineering rather than guesswork.'
      ),
    ],
    practiceProblemSlugs: ['electronics-tools-1', 'electronics-tools-2', 'electronics-tools-3'],
    quizProblemSlugs: ['electronics-tools-q1', 'electronics-tools-q2'],
  },

  {
    slug: 'components-circuit-elements',
    unitSlug: 'getting-started',
    title: 'The Electronic Components You Must Understand',
    summary:
      'Master resistors, potentiometers, capacitors, inductors, diodes, LEDs, switches, transistors, relays, crystals, and common protection components.',
    estimatedMinutes: 80,
    xpReward: 120,
    blocks: [
      text(
        'A circuit is easier to understand when you can predict what each component is trying to do. Learn components by **electrical behavior**, not by memorizing their names.'
      ),
      text(
        '**Resistors** establish current limits, voltage division, bias conditions, pull-ups/pull-downs, termination, and feedback. Learn series and parallel combinations and how power dissipation limits real resistor choices.'
      ),
      text(
        '**Potentiometers** are variable resistors commonly used as voltage dividers. Understand the difference between using the wiper as a voltage output and using the device as a variable resistance.'
      ),
      text(
        '**Capacitors** store energy in an electric field. They are used for decoupling, filtering, timing, coupling, energy storage, and transient response. Learn capacitance, voltage rating, polarity, ESR, leakage, and dielectric behavior.'
      ),
      text(
        '**Inductors** store energy in a magnetic field. Learn inductance, current continuity, magnetic saturation, winding resistance, and why inductors are fundamental to switching regulators and filtering.'
      ),
      text(
        '**Diodes** conduct preferentially in one direction. Learn forward voltage, reverse voltage, leakage, rectification, flyback protection, Schottky behavior, Zener regulation, TVS protection, and LED operation.'
      ),
      text(
        '**Transistors** are used as switches, amplifiers, current sources, and control elements. You will later study BJT and MOSFET behavior in detail; at this stage learn to recognize their terminals, control variables, and operating regions.'
      ),
      text(
        'Also recognize switches, fuses, resettable fuses, thermistors, photoresistors, crystals/oscillators, connectors, and protection components as parts of complete engineering systems.'
      ),
      text(
        'For every component, learn five questions: **What does it do? What are its terminals? What electrical model approximates it? What are its limits? What failure modes should I expect?**'
      ),
      callout(
        'tip',
        'Build a physical component library. Pick up each part, identify it from its marking or datasheet, sketch its symbol, state its purpose, and name one realistic failure mode.'
      ),
    ],
    practiceProblemSlugs: ['components-1', 'components-2', 'components-3'],
    quizProblemSlugs: ['components-q1', 'components-q2'],
    prerequisites: [{ lessonSlug: 'electronics-fundamentals', minMasteryScore: 70 }],
  },

  {
    slug: 'dc-circuit-analysis',
    unitSlug: 'getting-started',
    title: 'Circuit Analysis: KCL, KVL, Dividers, and Thevenin',
    summary:
      'Move beyond Ohm’s law into Kirchhoff’s laws, series/parallel analysis, voltage and current dividers, node analysis, source transformations, and Thevenin/Norton equivalents.',
    estimatedMinutes: 90,
    xpReward: 135,
    blocks: [
      text(
        'Ohm’s law is necessary but not sufficient for serious circuit analysis. The next step is learning to turn a schematic into equations and predictions.'
      ),
      text(
        '**Kirchhoff’s Current Law (KCL)** states that the algebraic sum of currents at a node is zero. **Kirchhoff’s Voltage Law (KVL)** states that the algebraic sum of voltage changes around a closed loop is zero.'
      ),
      text(
        'Use series resistance to reason about current and parallel resistance to reason about shared voltage. Then derive the **voltage-divider** and **current-divider** relationships rather than memorizing them.'
      ),
      text(
        'Learn **node-voltage analysis** and **mesh/loop analysis** as systematic methods for circuits that are too complicated for inspection alone.'
      ),
      text(
        '**Source transformations** let you convert between equivalent voltage-source/resistance and current-source/resistance representations when the topology permits.'
      ),
      text(
        '**Thevenin and Norton equivalents** reduce a linear two-terminal network to a simpler model. This is extremely useful for understanding sensor loading, input impedance, power transfer, and how one circuit block affects another.'
      ),
      text(
        'Introduce **loading** explicitly: a divider calculated without the load can produce the wrong real-world voltage once another circuit is connected. This is one of the first places where ideal textbook circuits diverge from hardware.'
      ),
      text(
        'Practice solving circuits symbolically first, then numerically, then verifying the prediction with a simulator or multimeter.'
      ),
      callout(
        'tip',
        'For every solved circuit, perform a sanity check: units, sign, limiting cases, expected magnitude, and conservation of current and energy.'
      ),
    ],
    practiceProblemSlugs: ['circuit-analysis-1', 'circuit-analysis-2', 'circuit-analysis-3', 'circuit-analysis-4'],
    quizProblemSlugs: ['circuit-analysis-q1', 'circuit-analysis-q2'],
    prerequisites: [{ lessonSlug: 'components-circuit-elements', minMasteryScore: 70 }],
  },

  {
    slug: 'capacitors-inductors-transients',
    unitSlug: 'getting-started',
    title: 'Time-Domain Electronics: Capacitors, Inductors, and Transients',
    summary:
      'Understand RC and RL time constants, charging/discharging, first-order responses, filtering, energy storage, and why circuits behave differently during switching.',
    estimatedMinutes: 85,
    xpReward: 125,
    blocks: [
      text(
        'Real electronics is dynamic. Voltages and currents change over time, and capacitors and inductors make those changes depend on history.'
      ),
      text(
        'A capacitor’s voltage cannot change instantaneously in an ideal model. An inductor’s current cannot change instantaneously in an ideal model. These two facts explain a huge range of practical switching behavior.'
      ),
      text(
        'For an RC circuit, the time constant is **τ = R × C**. After one time constant, a charging capacitor has reached about 63% of its final change; after roughly five time constants, the transition is effectively complete for many engineering purposes.'
      ),
      text(
        'For an RL circuit, the time constant is **τ = L / R** for the relevant equivalent resistance. Learn to identify the resistance seen by the reactive element before calculating the response.'
      ),
      text(
        'Use step responses to understand startup behavior, switch bounce filtering, sensor smoothing, reset circuits, delays, and pulse shaping.'
      ),
      text(
        'Introduce frequency intuition: an RC low-pass attenuates fast changes more strongly than slow changes. The cutoff frequency is approximately **f_c = 1 / (2πRC)** for a simple first-order RC low-pass.'
      ),
      text(
        'Learn why decoupling capacitors should be placed physically close to IC power pins and why a capacitor is not an ideal short circuit at every frequency.'
      ),
      callout(
        'tip',
        'Always ask whether a circuit is in steady state or in transition. Many hardware bugs only appear during startup, shutdown, switching, or load changes.'
      ),
    ],
    practiceProblemSlugs: ['transients-1', 'transients-2', 'transients-3'],
    quizProblemSlugs: ['transients-q1', 'transients-q2'],
    prerequisites: [{ lessonSlug: 'dc-circuit-analysis', minMasteryScore: 70 }],
  },

  {
    slug: 'diodes-transistors-basics',
    unitSlug: 'getting-started',
    title: 'Semiconductors: Diodes, BJTs, and MOSFETs',
    summary:
      'Build a device-level mental model of junction diodes, Zeners, BJTs, MOSFETs, switching regions, biasing, gate drive, and safe power switching.',
    estimatedMinutes: 95,
    xpReward: 145,
    blocks: [
      text(
        'Semiconductors are where electronics becomes controllable. Diodes and transistors let circuits rectify, regulate, switch, amplify, protect, and compute.'
      ),
      text(
        'Learn the PN-junction concept well enough to explain forward bias, reverse bias, depletion regions, leakage, and breakdown without treating a diode as a magical one-way valve.'
      ),
      text(
        'For a BJT, understand base, collector, and emitter; base current; collector current; cutoff; active operation; and saturation. Learn why a transistor switch needs adequate base drive and why a saturated BJT behaves differently from a linear amplifier.'
      ),
      text(
        'For a MOSFET, understand gate, drain, and source; threshold voltage versus useful gate-drive voltage; R_DS(on); gate charge; switching losses; body diode; and thermal limits.'
      ),
      text(
        'Learn the difference between **static ratings** and **dynamic behavior**. A MOSFET can have a large current rating yet still overheat because of resistance, switching losses, poor gate drive, or inadequate thermal design.'
      ),
      text(
        'Use a low-side MOSFET switch as a complete design exercise: select a device, calculate expected conduction loss, choose a gate resistor if appropriate, add a pull-down/pull-up where needed, protect an inductive load, and verify the power path.'
      ),
      callout(
        'warning',
        'Never select a transistor from a single headline number such as maximum current or threshold voltage. Read the electrical characteristics and application conditions in the datasheet.'
      ),
    ],
    practiceProblemSlugs: ['semiconductors-1', 'semiconductors-2', 'semiconductors-3'],
    quizProblemSlugs: ['semiconductors-q1', 'semiconductors-q2'],
    prerequisites: [{ lessonSlug: 'capacitors-inductors-transients', minMasteryScore: 70 }],
  },

  {
    slug: 'digital-logic-fundamentals',
    unitSlug: 'getting-started',
    title: 'Digital Electronics and Logic',
    summary:
      'Learn Boolean algebra, logic gates, truth tables, combinational circuits, flip-flops, counters, registers, clocking, and the hardware concepts behind microcontrollers.',
    estimatedMinutes: 90,
    xpReward: 135,
    blocks: [
      text(
        'Microcontrollers are built from digital logic. Understanding gates and state machines makes GPIO, timers, registers, buses, and peripherals much easier to reason about.'
      ),
      text(
        'Master **AND, OR, NOT, NAND, NOR, XOR, and XNOR** using truth tables. Learn De Morgan’s laws and Boolean simplification well enough to reduce a logic expression by inspection and by algebra.'
      ),
      text(
        'Distinguish **combinational logic**, where outputs depend on current inputs, from **sequential logic**, where state is stored and outputs depend on previous events.'
      ),
      text(
        'Study latches and flip-flops, especially D flip-flops, then build intuition for registers, counters, frequency division, and shift registers.'
      ),
      text(
        'Understand clock signals, setup and hold time, propagation delay, metastability, reset behavior, and why asynchronous external signals need careful synchronization.'
      ),
      text(
        'Connect this to GPIO: an input is not merely a software boolean. It is a voltage interpreted against electrical thresholds, with finite rise/fall time, noise margin, and possibly an internal pull resistor.'
      ),
      text(
        'Finish by reading a simple logic IC datasheet and comparing its guaranteed input/output voltage levels with those of a microcontroller.'
      ),
      callout(
        'tip',
        'Build small logic circuits on a breadboard or simulator. Predict the truth table first, then wire it, then test every input combination.'
      ),
    ],
    practiceProblemSlugs: ['logic-1', 'logic-2', 'logic-3', 'logic-4'],
    quizProblemSlugs: ['logic-q1', 'logic-q2'],
    prerequisites: [{ lessonSlug: 'diodes-transistors-basics', minMasteryScore: 70 }],
  },
]
