import type { Lesson } from '../../types'
import { text, codeSample, callout, interactive } from '../helpers'

export const advancedLessons: Lesson[] = [
  {
    slug: 'embedded-state-machines',
    unitSlug: 'advanced',
    title: 'Embedded Program Architecture: State Machines',
    summary:
      'Replace tangled if-statements and delays with finite state machines, events, states, transitions, and responsive embedded architecture.',
    estimatedMinutes: 50,
    xpReward: 90,
    blocks: [
      text(
        'As Arduino projects grow, the biggest challenge becomes **program architecture**, not individual API calls.'
      ),
      text(
        'A common beginner program is a long sequence of `delay()`, `if`, and sensor calls. This becomes difficult to extend because each part blocks or interferes with another.'
      ),
      text(
        'A **finite state machine (FSM)** models a system as a set of states and transitions between those states.'
      ),
      codeSample(
        'cpp',
        `enum State {
    IDLE,
    RUNNING,
    ERROR
};

State state = IDLE;

void loop()
{
    switch (state) {
        case IDLE:
            // Wait for start event.
            break;

        case RUNNING:
            // Perform normal operation.
            break;

        case ERROR:
            // Handle failure.
            break;
    }
}`
      ),
      text(
        'A transition occurs when an event or condition causes the system to move from one state to another.'
      ),
      text(
        'State machines work particularly well for devices such as vending machines, robots, alarms, washing machines, thermostats, and user interfaces.'
      ),
      text(
        'Combine state machines with `millis()` so each state can perform time-dependent actions without blocking the entire program.'
      ),
      callout(
        'tip',
        'If you find yourself adding more and more boolean flags such as `isStarting`, `isRunning`, `isStopping`, and `hasFinished`, consider whether an explicit state machine would make the logic clearer.'
      ),
    ],
    practiceProblemSlugs: ['arduino-state-1', 'arduino-state-2'],
    quizProblemSlugs: ['arduino-state-q1'],
  },

  {
    slug: 'interrupts',
    unitSlug: 'advanced',
    title: 'Interrupts: Responding to Hardware Events',
    summary:
      'Understand interrupts, interrupt service routines, volatile variables, atomic access, external interrupts, and correct ISR design.',
    estimatedMinutes: 55,
    xpReward: 95,
    blocks: [
      text(
        'Normally, an Arduino program repeatedly executes `loop()`. An **interrupt** allows hardware to request immediate attention when a configured event occurs.'
      ),
      text(
        'When an interrupt fires, the processor temporarily stops normal execution and runs an **interrupt service routine (ISR)**.'
      ),
      text(
        'On a classic Uno, external interrupts are associated with specific pins, and `attachInterrupt()` provides a convenient Arduino interface.'
      ),
      codeSample(
        'cpp',
        `volatile bool buttonEvent = false;

void buttonISR()
{
    buttonEvent = true;
}

void setup()
{
    pinMode(2, INPUT_PULLUP);

    attachInterrupt(
        digitalPinToInterrupt(2),
        buttonISR,
        FALLING
    );
}

void loop()
{
    if (buttonEvent) {
        noInterrupts();
        buttonEvent = false;
        interrupts();

        // Handle the event outside the ISR.
    }
}`
      ),
      text(
        'An ISR should normally be **very short**. Set a flag, capture a timestamp, increment a counter, or perform another minimal operation. Let the main program do the expensive work.'
      ),
      text(
        '`volatile` tells the compiler that a variable can change unexpectedly, such as from an ISR. It does not automatically make multi-byte operations atomic.'
      ),
      text(
        'If both the ISR and main program access a shared multi-byte value, you may need a short critical section using `noInterrupts()` and `interrupts()` to ensure the operation is atomic.'
      ),
      callout(
        'warning',
        'Avoid `delay()`, lengthy calculations, dynamic allocation, and generally `Serial.print()` inside ISRs. Keep interrupt handlers deterministic and short.'
      ),
      text(
        'Interrupts are useful when latency matters, but they are not automatically better than polling. Use the simplest mechanism that satisfies the timing requirements.'
      ),
    ],
    practiceProblemSlugs: ['arduino-int-1', 'arduino-int-2'],
    quizProblemSlugs: ['arduino-int-q1'],
    prerequisites: [
      { lessonSlug: 'embedded-state-machines', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'timers',
    unitSlug: 'advanced',
    title: 'Hardware Timers and Precise Timing',
    summary:
      'Understand microcontroller timers, PWM generation, timer conflicts, compare matches, and when direct register programming is appropriate.',
    estimatedMinutes: 60,
    xpReward: 100,
    blocks: [
      text(
        'A microcontroller contains hardware timers that count clock cycles independently of the main program.'
      ),
      text(
        'Timers can generate PWM, trigger interrupts, measure intervals, schedule events, and perform other precise timing operations.'
      ),
      text(
        'On a classic Uno using the ATmega328P, Timer0, Timer1, and Timer2 are used by different Arduino features. Arduino’s `millis()` and `delay()` depend on timer hardware, and libraries such as Servo can use specific timers.'
      ),
      text(
        'This creates an important embedded-systems concept: **hardware resources can conflict**. A library that uses a timer may change the behavior of another feature that depends on the same timer.'
      ),
      text(
        'A timer can be configured to generate an interrupt when its counter reaches a compare value.'
      ),
      codeSample(
        'cpp',
        `// Illustrative AVR timer configuration.
// Register-level code is board and MCU specific.

TCCR1A = 0;
TCCR1B = (1 << WGM12) |
         (1 << CS12) |
         (1 << CS10);

OCR1A = 15624;

TIMSK1 = (1 << OCIE1A);

ISR(TIMER1_COMPA_vect)
{
    // Keep this short.
}`
      ),
      text(
        'Register-level programming is powerful but **not portable**. The registers above apply to a particular AVR microcontroller family and should not be copied to an ESP32, RP2040, or another board.'
      ),
      text(
        'Before directly configuring a timer, understand what Arduino core or libraries are already using that timer.'
      ),
      callout(
        'warning',
        'Do not learn timer registers by memorizing register names. Learn to read the microcontroller datasheet and identify the clock source, prescaler, counter mode, compare registers, interrupt flags, and output behavior.'
      ),
      text(
        'For many projects, Arduino’s high-level timing functions are sufficient. Direct timer control becomes valuable when you need precise frequencies, deterministic scheduling, specialized PWM, or very low-level hardware control.'
      ),
    ],
    practiceProblemSlugs: ['arduino-timers-1', 'arduino-timers-2'],
    quizProblemSlugs: ['arduino-timers-q1'],
    prerequisites: [{ lessonSlug: 'interrupts', minMasteryScore: 70 }],
  },

  {
    slug: 'memory-performance',
    unitSlug: 'advanced',
    title: 'Memory, Performance, and Embedded Constraints',
    summary:
      'Understand flash, SRAM, stack, heap, static allocation, fragmentation, timing, and resource constraints on microcontrollers.',
    estimatedMinutes: 55,
    xpReward: 95,
    blocks: [
      text(
        'A desktop computer may have gigabytes of memory. A small microcontroller may have only a few kilobytes of RAM. Embedded programming therefore requires deliberate resource management.'
      ),
      text(
        'You should distinguish at least three important kinds of memory on typical Arduino-class systems: **program flash**, **SRAM**, and sometimes **EEPROM** or another nonvolatile storage mechanism.'
      ),
      text(
        'Program code and constant data commonly live in flash. Variables that must be actively modified at runtime normally require SRAM.'
      ),
      text(
        'Local variables and function call information use stack space. Dynamically allocated objects use the heap. Static/global objects have lifetimes spanning the entire program.'
      ),
      text(
        'On small embedded systems, excessive dynamic allocation can cause fragmentation or make memory usage difficult to predict.'
      ),
      callout(
        'tip',
        'Prefer static or fixed-size allocation when deterministic memory usage matters. Dynamic allocation is not forbidden; it simply needs to be deliberate.'
      ),
      text(
        'Large constant strings can consume valuable RAM depending on the platform and compiler. On AVR Arduino boards, mechanisms such as `PROGMEM` can store constants in flash instead.'
      ),
      text(
        'Performance is not only about CPU speed. An embedded program must meet deadlines, avoid blocking operations when responsiveness matters, and use peripherals efficiently.'
      ),
      text(
        'A useful optimization workflow is: **measure → identify the bottleneck → change one thing → measure again**.'
      ),
      text(
        'Do not optimize code merely because it looks slow. A slower but readable program is often preferable until measurement demonstrates a real problem.'
      ),
    ],
    practiceProblemSlugs: ['arduino-memory-1', 'arduino-memory-2'],
    quizProblemSlugs: ['arduino-memory-q1'],
    prerequisites: [{ lessonSlug: 'timers', minMasteryScore: 70 }],
  },

  {
    slug: 'power-sleep',
    unitSlug: 'advanced',
    title: 'Power Management and Battery Design',
    summary:
      'Understand current consumption, regulators, batteries, sleep modes, wake-up sources, brownouts, and practical low-power design.',
    estimatedMinutes: 55,
    xpReward: 95,
    blocks: [
      text(
        'Battery-powered embedded systems are fundamentally power-engineering problems as well as programming problems.'
      ),
      text(
        'Start with the relationship **Power = Voltage × Current**. Battery life depends on the energy available from the battery and how much power the system consumes over time.'
      ),
      text(
        'A system that consumes 50 mA continuously is fundamentally different from one that sleeps at a few microamps and wakes briefly to take measurements.'
      ),
      text(
        'Common sources of unnecessary consumption include indicator LEDs, unused peripherals, inefficient voltage regulators, sensors that remain powered continuously, and radios left active.'
      ),
      text(
        'Many microcontrollers provide sleep modes that stop some or most internal clocks and peripherals. The deeper the sleep, the fewer features remain active and the more limited the available wake-up sources.'
      ),
      codeSample(
        'cpp',
        `#include <avr/sleep.h>

void sleepBriefly()
{
    set_sleep_mode(SLEEP_MODE_PWR_DOWN);

    sleep_enable();
    sleep_cpu();

    // Execution continues after wake-up.

    sleep_disable();
}`
      ),
      text(
        'The exact sleep APIs and wake-up capabilities are microcontroller-specific. AVR sleep code should not be copied directly to an ESP32 or RP2040.'
      ),
      text(
        '**Brownout** occurs when supply voltage falls too low for reliable operation. Battery systems must account for regulator dropout, battery discharge, startup current, and transient loads.'
      ),
      callout(
        'warning',
        'Never design battery life from nominal current alone. Measure real current in active, idle, radio-transmitting, motor-starting, and sleep states.'
      ),
      callout(
        'tip',
        'A multimeter is useful, but a current logger or oscilloscope can reveal short current spikes that a basic meter may miss.'
      ),
    ],
    practiceProblemSlugs: ['arduino-power-1', 'arduino-power-2'],
    quizProblemSlugs: ['arduino-power-q1'],
    prerequisites: [{ lessonSlug: 'memory-performance', minMasteryScore: 70 }],
  },

  {
    slug: 'esp32-wifi',
    unitSlug: 'advanced',
    title: 'ESP32: Wi-Fi, Networking, and IoT',
    summary:
      'Move from classic Arduino boards to ESP32 and learn Wi-Fi, TCP/IP concepts, HTTP, web servers, MQTT, credentials, and OTA updates.',
    estimatedMinutes: 60,
    xpReward: 105,
    blocks: [
      text(
        'The ESP32 family combines a microcontroller with wireless networking capabilities. It is useful for connected sensors, web interfaces, automation, and IoT devices.'
      ),
      text(
        'ESP32 boards differ significantly from the classic Uno. They commonly use **3.3 V logic**, have different GPIO behavior, more RAM and flash, and substantially different peripherals.'
      ),
      text(
        'Do not assume that an Uno circuit can be moved to an ESP32 by changing only the board selection.'
      ),
      text(
        'Wi-Fi connects the device to an IP network. Higher-level protocols such as HTTP and MQTT then provide useful application-level communication.'
      ),
      codeSample(
        'cpp',
        `#include <WiFi.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

void setup()
{
    Serial.begin(115200);

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(250);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("Connected");
    Serial.println(WiFi.localIP());
}

void loop() {}`
      ),
      text(
        '**HTTP** follows a request/response model. An ESP32 can act as an HTTP client when requesting data from a server or as an HTTP server when serving a local interface.'
      ),
      text(
        '**MQTT** uses publish/subscribe messaging. Devices publish messages to topics, and clients subscribe to topics they care about.'
      ),
      text(
        'Internet-connected devices introduce security concerns. Do not hard-code real credentials into public repositories. Use encrypted connections when appropriate, authenticate devices, validate server certificates where supported, and minimize exposed services.'
      ),
      text(
        '**OTA (Over-The-Air)** updates allow firmware to be updated over a network. This is convenient but increases the importance of authentication, integrity, rollback strategy, and recovery from failed updates.'
      ),
      callout(
        'warning',
        'A device connected to Wi-Fi is potentially exposed to hostile network traffic. Networking should be treated as a security boundary, not merely another Arduino library.'
      ),
      interactive('circuit-sim', {
        board: 'esp32',
        components: [
          { type: 'led', pin: 2, color: 'blue' },
          { type: 'button', pin: 0, pullup: true },
        ],
        code:
          '#include <WiFi.h> #include <WebServer.h> WebServer server(80); void setup() { pinMode(2,OUTPUT); WiFi.begin("ssid","pass"); while(WiFi.status()!=WL_CONNECTED) delay(500); server.on("/",[](){ server.send(200,"text/plain","ESP32 OK"); digitalWrite(2,!digitalRead(2)); }); server.begin(); } void loop() { server.handleClient(); }',
      }),
    ],
    practiceProblemSlugs: ['arduino-wifi-1', 'arduino-wifi-2'],
    quizProblemSlugs: ['arduino-wifi-q1', 'arduino-wifi-q2'],
    prerequisites: [{ lessonSlug: 'power-sleep', minMasteryScore: 70 }],
  },

  {
    slug: 'freertos',
    unitSlug: 'advanced',
    title: 'FreeRTOS on ESP32: Tasks and Concurrency',
    summary:
      'Understand tasks, scheduling, delays, queues, mutexes, semaphores, shared data, and concurrency on ESP32.',
    estimatedMinutes: 65,
    xpReward: 110,
    blocks: [
      text(
        '**FreeRTOS** is a real-time operating-system kernel used by many embedded systems. ESP32 development environments can expose FreeRTOS functionality beneath the Arduino programming model.'
      ),
      text(
        'A **task** is an independently scheduled unit of execution. Tasks have stacks, priorities, and states such as running, ready, and blocked.'
      ),
      codeSample(
        'cpp',
        `void sensorTask(void* parameter)
{
    while (true) {
        // Read sensor.

        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void setup()
{
    xTaskCreate(
        sensorTask,
        "Sensor",
        4096,
        nullptr,
        1,
        nullptr
    );
}

void loop()
{
    vTaskDelay(portMAX_DELAY);
}`
      ),
      text(
        '`vTaskDelay` blocks the task that calls it while allowing other tasks to execute. This is fundamentally different from using a blocking delay in a single-threaded architecture.'
      ),
      text(
        '**Queues** provide a structured way for tasks or interrupt handlers to exchange data.'
      ),
      codeSample(
        'cpp',
        `QueueHandle_t sensorQueue;

void producer(void* parameter)
{
    int value = 42;

    xQueueSend(
        sensorQueue,
        &value,
        portMAX_DELAY
    );

    vTaskDelete(nullptr);
}

void setup()
{
    sensorQueue = xQueueCreate(10, sizeof(int));

    xTaskCreate(
        producer,
        "Producer",
        2048,
        nullptr,
        1,
        nullptr
    );
}

void loop()
{
    int value;

    if (xQueueReceive(
        sensorQueue,
        &value,
        0
    ) == pdTRUE) {
        // Process value.
    }
}`
      ),
      text(
        'A **mutex** protects shared resources. A **semaphore** can signal that an event or resource is available. These mechanisms solve different synchronization problems.'
      ),
      text(
        'Concurrency introduces new bugs: race conditions, deadlocks, priority inversion, stack exhaustion, and unsafe shared-state access.'
      ),
      callout(
        'warning',
        'Do not create tasks simply because you can. First identify independent activities and communication boundaries. A well-designed event-driven program is often simpler than many competing tasks.'
      ),
      callout(
        'tip',
        'Before using FreeRTOS, become comfortable with non-blocking Arduino programs, state machines, interrupts, and shared-state reasoning. RTOS concepts build on those foundations.'
      ),
    ],
    practiceProblemSlugs: ['arduino-rtos-1', 'arduino-rtos-2'],
    quizProblemSlugs: ['arduino-rtos-q1'],
    prerequisites: [{ lessonSlug: 'esp32-wifi', minMasteryScore: 70 }],
  },

  {
    slug: 'debugging-embedded',
    unitSlug: 'advanced',
    title: 'Debugging Real Embedded Systems',
    summary:
      'Develop a systematic debugging process using serial logs, multimeters, oscilloscopes, logic analyzers, datasheets, assertions, and controlled experiments.',
    estimatedMinutes: 60,
    xpReward: 105,
    blocks: [
      text(
        'Embedded debugging is different from ordinary application debugging because the failure may exist in **software, wiring, power, timing, communication, or the component itself**.'
      ),
      text(
        'Use a disciplined process instead of randomly changing code.'
      ),
      text(
        '**Step 1: reproduce the failure. Step 2: reduce the system. Step 3: verify power and ground. Step 4: verify signals electrically. Step 5: isolate software behavior. Step 6: inspect assumptions against the datasheet.**'
      ),
      text(
        'A multimeter can measure voltage, resistance, continuity, and—with appropriate setup—current. An oscilloscope shows how voltage changes over time. A logic analyzer is particularly useful for digital protocols such as UART, I²C, and SPI.'
      ),
      text(
        'For example, if an I²C sensor returns no data, first verify supply voltage and ground. Then verify SDA and SCL wiring and pull-ups. Then use an I²C scanner. Then inspect the device address and initialization sequence. Only after that should you deeply investigate application code.'
      ),
      text(
        '**Change one variable at a time.** If you simultaneously replace the library, rewire the circuit, change the baud rate, and modify the program, you have learned almost nothing about which change mattered.'
      ),
      text(
        'Use serial logging strategically. Record timestamps, state transitions, sensor values, error codes, and important configuration values.'
      ),
      callout(
        'warning',
        'A program that works when serial logging is enabled but fails when logging is removed may have a timing, race-condition, buffer, or power problem. Treat that behavior as evidence, not as proof that serial logging “fixes” the device.'
      ),
      text(
        'Professional embedded debugging is essentially experimental science: **form a hypothesis, make a controlled change, observe the result, and update the hypothesis**.'
      ),
    ],
    practiceProblemSlugs: ['arduino-debug-1', 'arduino-debug-2'],
    quizProblemSlugs: ['arduino-debug-q1'],
    prerequisites: [{ lessonSlug: 'freertos', minMasteryScore: 70 }],
  },

  {
    slug: 'arduino-capstone',
    unitSlug: 'advanced',
    title: 'Arduino Mastery Capstone: Build a Complete Embedded System',
    summary:
      'Combine electronics, sensors, actuators, displays, communication, state machines, error handling, and power management in one substantial project.',
    estimatedMinutes: 180,
    xpReward: 250,
    blocks: [
      text(
        'The final step toward Arduino mastery is building a system where hardware and software must work together reliably.'
      ),
      text(
        'Build a **smart environmental controller**. The system should measure at least one environmental value, display its current state, control an actuator, accept user input, record or transmit data, and recover gracefully from errors.'
      ),
      text(
        '**Minimum hardware architecture:** microcontroller + sensor + display + button/input + actuator/driver + appropriate power supply.'
      ),
      text(
        '**Minimum software architecture:** sensor abstraction, non-blocking scheduler, user-input handling, state machine, display update, actuator control, error handling, and serial diagnostics.'
      ),
      text(
        'The project should contain at least three meaningful operating states, for example:'
      ),
      codeSample(
        'text',
        `IDLE
  ↓
MONITORING
  ↓
ALERT
  ↓
ERROR`
      ),
      text(
        'Use `millis()` rather than long blocking delays. Debounce buttons. Validate sensor readings. Handle missing sensors or communication failures. Do not drive high-current loads directly from GPIO.'
      ),
      text(
        'If using I²C or SPI peripherals, document their addresses and wiring. If using a motor or other inductive load, document the driver and external power path.'
      ),
      text(
        'Add a serial diagnostic interface that can report current state, sensor values, actuator state, uptime, and error conditions.'
      ),
      text(
        '**Reliability tests:** unplug a sensor, provide invalid input, rapidly press buttons, restart the board, disconnect and reconnect power, operate the actuator repeatedly, and run the system for an extended period.'
      ),
      text(
        '**Engineering documentation:** include a schematic, pin map, power budget, component list, state diagram, communication protocol description, and explanation of failure handling.'
      ),
      text(
        'For an advanced version, add ESP32 networking, persistent configuration, OTA updates, deep sleep, or an RTOS task architecture.'
      ),
      callout(
        'tip',
        'You have mastered Arduino when you can take an unfamiliar component, read its documentation, determine how it must be powered and connected, write the software to communicate with it, debug failures systematically, and integrate it into a larger reliable system.'
      ),
      callout(
        'warning',
        'Do not judge the project only by whether it works once. Embedded mastery means understanding the electrical limits, timing behavior, failure modes, resource usage, and recovery behavior of the complete system.'
      ),
    ],
    practiceProblemSlugs: [
      'arduino-capstone-1',
      'arduino-capstone-2',
      'arduino-capstone-3',
    ],
    quizProblemSlugs: ['arduino-capstone-q1', 'arduino-capstone-q2'],
    prerequisites: [{ lessonSlug: 'debugging-embedded', minMasteryScore: 80 }],
  },


  {
    slug: 'embedded-c-programming',
    unitSlug: 'advanced',
    title: 'Embedded C/C++: From Sketches to Firmware',
    summary:
      'Develop the programming foundations needed for professional firmware: types, pointers, arrays, structs, bit operations, memory layout, interfaces, and defensive coding.',
    estimatedMinutes: 100,
    xpReward: 150,
    blocks: [
      text(
        'Arduino sketches hide some of the language and build-system details. Professional firmware requires a stronger understanding of C/C++ and the machine underneath.'
      ),
      text(
        'Master integer types, signedness, overflow, integer promotion, fixed-width types such as `uint8_t`, `uint16_t`, and `uint32_t`, and why exact-width types matter in hardware protocols.'
      ),
      text(
        'Learn arrays, pointers, references, structs, enums, unions where appropriate, const-correctness, function interfaces, and ownership/lifetime of objects.'
      ),
      text(
        'Bitwise operations are fundamental to embedded systems. Master masks, shifts, setting/clearing/testing bits, packed fields, and register manipulation.'
      ),
      text(
        'Understand memory-mapped peripherals conceptually: a register is a hardware interface represented through a software-visible address. Reads and writes can have side effects.'
      ),
      text(
        'Learn defensive firmware practices: validate inputs, bound buffers, avoid accidental blocking, check return codes, use assertions where appropriate, document assumptions, and define failure states.'
      ),
      text(
        'Introduce compilation units, headers, linking, libraries, build configurations, compiler warnings, and reproducible builds. The goal is to understand what happens between source code and firmware running on the MCU.'
      ),
      callout(
        'tip',
        'Turn compiler warnings up early. In embedded work, a warning about signedness, narrowing, unused results, or suspicious conversions can reveal a real hardware bug.'
      ),
    ],
    practiceProblemSlugs: ['embedded-c-1', 'embedded-c-2', 'embedded-c-3'],
    quizProblemSlugs: ['embedded-c-q1', 'embedded-c-q2'],
    prerequisites: [{ lessonSlug: 'memory-performance', minMasteryScore: 70 }],
  },

  {
    slug: 'pcb-design',
    unitSlug: 'advanced',
    title: 'PCB Design: From Schematic to Manufactured Board',
    summary:
      'Learn schematic capture, footprints, net classes, grounding, power distribution, decoupling, routing, design rules, fabrication files, and bring-up.',
    estimatedMinutes: 110,
    xpReward: 160,
    blocks: [
      text(
        'A breadboard is useful for learning, but a PCB is where electrical, mechanical, thermal, manufacturing, and reliability constraints meet.'
      ),
      text(
        'Start with a **schematic** that communicates intent. Label nets, define power domains, document connectors, add protection, and make component values and reference designators unambiguous.'
      ),
      text(
        'Learn footprints, pin-1 orientation, package constraints, courtyard/keepout concepts, mounting holes, connector placement, and the difference between a schematic symbol and a physical footprint.'
      ),
      text(
        'Design power distribution deliberately. Place decoupling capacitors near IC supply pins, provide short current-return paths, separate sensitive analog paths from noisy switching paths where justified, and avoid accidental high-current bottlenecks.'
      ),
      text(
        'Learn trace width, current capacity, clearances, vias, thermal reliefs, differential pairs at a conceptual level, controlled impedance when required, and why ground-plane continuity matters.'
      ),
      text(
        'Understand design-rule checking, ERC, manufacturing constraints, panelization basics, Gerbers/drill files, assembly drawings, bill of materials, and revision control.'
      ),
      text(
        'Plan PCB bring-up before fabrication. Provide test points, programming access, reset access, status indicators, current-measurement opportunities, and a staged power-up procedure.'
      ),
      callout(
        'tip',
        'The best PCB is not merely electrically correct. It is easy to assemble, probe, repair, program, revise, and manufacture consistently.'
      ),
    ],
    practiceProblemSlugs: ['pcb-1', 'pcb-2', 'pcb-3'],
    quizProblemSlugs: ['pcb-q1', 'pcb-q2'],
    prerequisites: [{ lessonSlug: 'debugging-embedded', minMasteryScore: 70 }],
  },

  {
    slug: 'reliability-testing',
    unitSlug: 'advanced',
    title: 'Reliability, Fault Injection, and Verification',
    summary:
      'Learn requirements, test plans, boundary conditions, fault injection, watchdogs, brownouts, environmental stress, logging, and evidence-based verification.',
    estimatedMinutes: 100,
    xpReward: 150,
    blocks: [
      text(
        'A prototype demonstrates that a system can work. Engineering verification demonstrates that it works under defined conditions and fails safely when those conditions are violated.'
      ),
      text(
        'Write measurable requirements before testing: input range, accuracy, timing, power consumption, temperature range, communication reliability, startup time, and failure behavior.'
      ),
      text(
        'Build a test matrix covering nominal operation, minimum and maximum supply, sensor limits, invalid inputs, missing peripherals, communication loss, repeated resets, and long-duration operation.'
      ),
      text(
        'Learn **fault injection**: intentionally disconnect a sensor, corrupt a packet, press buttons rapidly, stall a motor, lower the supply voltage, or force a timeout. Observe whether the firmware enters a defined safe state.'
      ),
      text(
        'Use watchdog timers, brownout detection, sanity limits, plausibility checks, retries with bounds, persistent fault counters, and recovery procedures as appropriate.'
      ),
      text(
        'Separate functional testing from performance testing and endurance testing. Record evidence rather than relying on “it seemed fine.”'
      ),
      text(
        'For every detected fault, define whether the system should retry, degrade gracefully, alert the user, reset, enter a safe state, or require service.'
      ),
      callout(
        'tip',
        'A mature embedded design can explain not only how it works, but also how it detects failure, how it recovers, and what happens when recovery is impossible.'
      ),
    ],
    practiceProblemSlugs: ['reliability-1', 'reliability-2', 'reliability-3'],
    quizProblemSlugs: ['reliability-q1', 'reliability-q2'],
    prerequisites: [{ lessonSlug: 'pcb-design', minMasteryScore: 70 }],
  },

  {
    slug: 'electromagnetics-emi',
    unitSlug: 'advanced',
    title: 'EMI, EMC, Grounding, and Noise',
    summary:
      'Understand where electromagnetic interference comes from and how grounding, return paths, filtering, shielding, edge rates, and layout control it.',
    estimatedMinutes: 95,
    xpReward: 145,
    blocks: [
      text(
        'Many electronics failures are not logic errors; they are noise problems. Fast currents create voltage disturbances, electric fields, magnetic fields, and unintended coupling paths.'
      ),
      text(
        'Learn the importance of **return paths**. Current always completes a loop, and the physical path of the return current strongly affects noise and signal integrity.'
      ),
      text(
        'Understand common coupling mechanisms: conducted noise, capacitive coupling, inductive coupling, radiated coupling, ground bounce, supply bounce, and crosstalk.'
      ),
      text(
        'Learn why fast edge rates contain high-frequency energy even when the digital signal itself repeats at a relatively low frequency.'
      ),
      text(
        'Study practical mitigation: local decoupling, ferrites where justified, RC filtering, common-mode chokes, shielding, twisted pairs, differential signaling, ground-plane continuity, cable routing, and controlled edge rates.'
      ),
      text(
        'Distinguish **ground as a reference** from **ground as a physical conductor**. Two points can be conceptually called ground while having a measurable voltage difference under load.'
      ),
      text(
        'Introduce EMC thinking: emissions are what your device puts into the environment; immunity is how well it continues operating when exposed to interference.'
      ),
      callout(
        'tip',
        'When debugging noise, ask three questions: where is the noise generated, what path couples it into the victim circuit, and where can that path be interrupted or reduced?'
      ),
    ],
    practiceProblemSlugs: ['emi-1', 'emi-2', 'emi-3'],
    quizProblemSlugs: ['emi-q1', 'emi-q2'],
    prerequisites: [{ lessonSlug: 'pcb-design', minMasteryScore: 70 }],
  },

  {
    slug: 'master-capstone',
    unitSlug: 'advanced',
    title: 'Master Electronics Capstone: Design a Complete Embedded Product',
    summary:
      'Integrate circuit analysis, power, sensing, actuation, communications, firmware, PCB design, testing, documentation, and fault handling into one engineering project.',
    estimatedMinutes: 180,
    xpReward: 300,
    blocks: [
      text(
        'The final objective is not to memorize electronics facts. It is to demonstrate that you can take a system requirement and turn it into a working, measurable, documented electronic product.'
      ),
      text(
        'Choose a project with at least **one sensor, one actuator, one user interface, one communication interface, independent power design, persistent configuration or data, and a defined failure mode**.'
      ),
      text(
        'Phase 1 — Requirements: define measurable behavior, operating environment, power source, lifetime, accuracy, response time, communications, physical constraints, safety requirements, and acceptance tests.'
      ),
      text(
        'Phase 2 — Architecture: divide the system into power, sensing, processing, actuation, communications, user interface, and safety/fault subsystems. Identify interfaces and dependencies.'
      ),
      text(
        'Phase 3 — Electrical design: calculate currents, voltages, resistor values, transistor losses, regulator dissipation, ADC range, signal conditioning, connector ratings, and protection requirements. Produce a schematic.'
      ),
      text(
        'Phase 4 — Firmware architecture: define states, events, timing requirements, communication protocols, error handling, data structures, and resource budgets before writing the full application.'
      ),
      text(
        'Phase 5 — Prototype: build the smallest end-to-end slice first. Verify power and individual interfaces before integrating the complete system.'
      ),
      text(
        'Phase 6 — Instrumentation: capture measurements with a multimeter, oscilloscope, or logic analyzer. Compare expected and actual values and document discrepancies.'
      ),
      text(
        'Phase 7 — PCB and enclosure: convert the validated design into a manufacturable board, include test points and programming access, and account for thermal and mechanical constraints.'
      ),
      text(
        'Phase 8 — Verification: run the full test matrix, inject faults, measure power states, test communication failures, restart repeatedly, and document evidence for every requirement.'
      ),
      text(
        'Phase 9 — Documentation: deliver a block diagram, schematic, BOM, firmware source, pin map, protocol specification, calibration procedure, test report, known limitations, and revision history.'
      ),
      text(
        'A project is complete only when another technically competent person can reproduce the build, understand the design decisions, run the tests, and identify what remains uncertain.'
      ),
      callout(
        'tip',
        'Use the capstone to prove mastery rather than to introduce a brand-new topic. If the project exposes a knowledge gap, return to the relevant lesson, learn it, and record the new evidence in your design notes.'
      ),
    ],
    practiceProblemSlugs: ['master-capstone-1', 'master-capstone-2', 'master-capstone-3', 'master-capstone-4'],
    quizProblemSlugs: ['master-capstone-q1'],
    prerequisites: [{ lessonSlug: 'reliability-testing', minMasteryScore: 80 }],
  },
]
