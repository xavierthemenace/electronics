import type { Lesson } from '../../types'
import { text, codeSample, callout, interactive } from '../helpers'

export const communicationLessons: Lesson[] = [
  {
    slug: 'communication-fundamentals',
    unitSlug: 'communication',
    title: 'How Microcontrollers Communicate',
    summary:
      'Learn the difference between parallel and serial communication, synchronous and asynchronous protocols, bytes, messages, buses, and logic levels.',
    estimatedMinutes: 40,
    xpReward: 70,
    blocks: [
      text(
        'A microcontroller becomes much more useful when it can communicate with sensors, displays, computers, memory chips, and other microcontrollers.'
      ),
      text(
        'At the lowest level, communication means representing information as electrical signals and agreeing on how those signals should be interpreted.'
      ),
      text(
        'A **bit** is a binary value: 0 or 1. Eight bits make a **byte**. Larger values can be represented using multiple bytes.'
      ),
      text(
        'Communication can be **parallel**, where several bits travel simultaneously on separate wires, or **serial**, where bits are transmitted over time.'
      ),
      text(
        'Most Arduino peripheral protocols you will encounter are serial. Three especially important families are **UART, I²C, and SPI**.'
      ),
      text(
        '**UART** is asynchronous and commonly uses TX/RX. **I²C** is a synchronous shared bus using SDA and SCL. **SPI** is a synchronous bus commonly using SCK, MOSI, MISO, and one or more chip-select lines.'
      ),
      text(
        'A protocol can also define much more than electrical signaling. A sensor datasheet might specify device addresses, registers, commands, byte order, timing requirements, checksums, and error behavior.'
      ),
      text(
        '**Logic level matters.** A 3.3 V microcontroller and a 5 V microcontroller may not have compatible input/output voltage requirements. Always verify the electrical specifications.'
      ),
      callout(
        'warning',
        '“The code uses the same Arduino library” does not mean two devices are electrically compatible. Software compatibility and electrical compatibility are separate questions.'
      ),
      text(
        'A useful debugging hierarchy is: **power → ground → physical wiring → electrical levels → protocol settings → device address/configuration → software**.'
      ),
      callout(
        'tip',
        'When a communication device does not work, do not immediately rewrite the code. Verify the physical layer first.'
      ),
    ],
    practiceProblemSlugs: ['arduino-comms-1', 'arduino-comms-2'],
    quizProblemSlugs: ['arduino-comms-q1'],
  },

  {
    slug: 'uart',
    unitSlug: 'communication',
    title: 'UART: Serial Communication in Depth',
    summary:
      'Master UART framing, baud rate, TX/RX wiring, buffers, message protocols, and reliable serial communication.',
    estimatedMinutes: 50,
    xpReward: 80,
    blocks: [
      text(
        'UART is an **asynchronous serial communication** method. Unlike synchronous protocols, it does not normally provide a separate clock line.'
      ),
      text(
        'The sender and receiver agree on settings such as baud rate, data bits, parity, and stop bits.'
      ),
      text(
        'A typical UART connection is crossed: **TX → RX, RX → TX, and GND → GND**.'
      ),
      text(
        'A UART byte is transmitted using a frame containing a start bit, data bits, optional parity, and one or more stop bits. The exact frame configuration must agree on both sides.'
      ),
      codeSample(
        'cpp',
        `void setup()
{
    Serial.begin(115200);
}

void loop()
{
    if (Serial.available() > 0) {
        char received = Serial.read();

        Serial.print("You sent: ");
        Serial.println(received);
    }
}`
      ),
      text(
        'The Arduino `Serial` class provides a convenient interface, but underneath it is a hardware peripheral with transmit and receive buffers.'
      ),
      text(
        'For reliable communication, do not assume that one `Serial.read()` returns a complete message. A message may arrive one byte at a time.'
      ),
      text(
        'A simple line-based protocol might define every command as a line ending in `\\n`.'
      ),
      codeSample(
        'cpp',
        `char buffer[32];
size_t length = 0;

void loop()
{
    while (Serial.available() > 0) {
        char c = Serial.read();

        if (c == '\\n') {
            buffer[length] = '\\0';

            // Process the complete message.
            Serial.print("Command: ");
            Serial.println(buffer);

            length = 0;
        }
        else if (length < sizeof(buffer) - 1) {
            buffer[length++] = c;
        }
    }
}`
      ),
      text(
        'This approach illustrates an important embedded concept: **receive bytes continuously, store them safely, and process a complete message only when the message boundary is known**.'
      ),
      callout(
        'warning',
        'Never allow incoming serial data to write beyond a fixed-size buffer. Buffer overflows are a common embedded-programming bug.'
      ),
      text(
        'For device-to-device communication, consider defining a protocol with a start marker, length field, payload, and checksum or CRC when corrupted data must be detected.'
      ),
    ],
    practiceProblemSlugs: ['arduino-uart-1', 'arduino-uart-2'],
    quizProblemSlugs: ['arduino-uart-q1'],
    prerequisites: [
      { lessonSlug: 'communication-fundamentals', minMasteryScore: 70 },
    ],
  },

  {
    slug: 'i2c',
    unitSlug: 'communication',
    title: 'I²C: Shared Two-Wire Buses',
    summary:
      'Understand SDA, SCL, addresses, pull-up resistors, master/device communication, registers, and common I²C debugging techniques.',
    estimatedMinutes: 55,
    xpReward: 90,
    blocks: [
      text(
        '**I²C (Inter-Integrated Circuit)** is a synchronous two-wire bus commonly used for sensors, displays, RTCs, EEPROMs, and other peripherals.'
      ),
      text(
        'The two primary signals are **SDA** (data) and **SCL** (clock). Devices on the same bus share these lines and ground.'
      ),
      text(
        'I²C devices normally have an **address**. This allows multiple devices to share the same SDA and SCL lines, provided their addresses do not conflict.'
      ),
      text(
        'I²C lines are generally implemented as open-drain/open-collector signals and require **pull-up resistors**. Many breakout boards already include them.'
      ),
      text(
        'The bus uses a controller/target model in modern terminology. Many Arduino libraries and older documentation still use “master/slave.”'
      ),
      codeSample(
        'cpp',
        `#include <Wire.h>

void setup()
{
    Wire.begin();
}

void loop()
{
    Wire.beginTransmission(0x3C);
    Wire.write(0x00);
    Wire.endTransmission();

    delay(1000);
}`
      ),
      text(
        'The exact sequence depends on the device. Many sensors expose internal **registers**. A typical transaction selects a register and then reads or writes its contents.'
      ),
      text(
        'An I²C scanner is a useful diagnostic tool because it can report which addresses acknowledge on the bus.'
      ),
      codeSample(
        'cpp',
        `#include <Wire.h>

void setup()
{
    Serial.begin(115200);
    Wire.begin();

    for (byte address = 1; address < 127; address++) {
        Wire.beginTransmission(address);

        if (Wire.endTransmission() == 0) {
            Serial.print("Found device at 0x");
            Serial.println(address, HEX);
        }
    }
}

void loop() {}`
      ),
      text(
        'Common causes of I²C failure include incorrect SDA/SCL wiring, missing ground, wrong voltage levels, missing pull-ups, address conflicts, incorrect device initialization, and a wrong library configuration.'
      ),
      callout(
        'warning',
        'Do not blindly add additional pull-up resistors. Multiple breakout boards may already have pull-ups, and too much combined pull-up strength can create excessive current or violate bus requirements.'
      ),
      callout(
        'tip',
        'Learn to identify a device’s I²C address from its datasheet or by using a scanner. “The library compiled” does not prove that the hardware is communicating.'
      ),
    ],
    practiceProblemSlugs: ['arduino-i2c-1', 'arduino-i2c-2'],
    quizProblemSlugs: ['arduino-i2c-q1', 'arduino-i2c-q2'],
    prerequisites: [{ lessonSlug: 'uart', minMasteryScore: 70 }],
  },

  {
    slug: 'spi',
    unitSlug: 'communication',
    title: 'SPI: Fast Synchronous Communication',
    summary:
      'Learn SPI clocking, MOSI, MISO, SCK, chip select, multiple devices, modes, and when SPI is preferable to I²C.',
    estimatedMinutes: 50,
    xpReward: 85,
    blocks: [
      text(
        '**SPI (Serial Peripheral Interface)** is a synchronous serial bus commonly used for displays, SD cards, ADCs, DACs, and other high-speed peripherals.'
      ),
      text(
        'A typical SPI connection uses **SCK** (clock), **MOSI** (controller out / target in), **MISO** (target out / controller in), and **CS/SS** (chip select). Ground is also required.'
      ),
      text(
        'Unlike I²C, SPI commonly uses a separate chip-select signal for each target device.'
      ),
      codeSample(
        'cpp',
        `#include <SPI.h>

const int CS = 10;

void setup()
{
    pinMode(CS, OUTPUT);
    digitalWrite(CS, HIGH);

    SPI.begin();
}

byte readDevice()
{
    digitalWrite(CS, LOW);

    byte result = SPI.transfer(0x00);

    digitalWrite(CS, HIGH);

    return result;
}`
      ),
      text(
        'SPI has several configuration details, including clock frequency, bit order, and clock polarity/phase. These are collectively important because the controller and peripheral must agree on how bits are sampled.'
      ),
      text(
        '`SPI.beginTransaction()` and `SPI.endTransaction()` allow a library to configure the bus appropriately for a particular device.'
      ),
      text(
        'SPI often provides higher throughput than I²C, but it generally uses more wires and does not inherently provide device addressing like I²C.'
      ),
      text(
        '**Rule of thumb:** use I²C when convenient shared two-wire communication is valuable; use SPI when speed, deterministic transfers, or a peripheral’s requirements make it appropriate.'
      ),
      callout(
        'warning',
        'SPI pin assignments are board-specific. Always consult the pinout for the exact board rather than memorizing Uno pin numbers.'
      ),
      callout(
        'tip',
        'When debugging SPI, verify CS first. A peripheral can be perfectly wired to MOSI, MISO, and SCK and still appear dead if its chip-select line is wrong.'
      ),
    ],
    practiceProblemSlugs: ['arduino-spi-1', 'arduino-spi-2'],
    quizProblemSlugs: ['arduino-spi-q1'],
    prerequisites: [{ lessonSlug: 'i2c', minMasteryScore: 70 }],
  },

  {
    slug: 'protocol-design',
    unitSlug: 'communication',
    title: 'Designing Reliable Device Protocols',
    summary:
      'Move beyond Arduino library calls and learn framing, checksums, CRCs, timeouts, retries, state machines, and fault handling.',
    estimatedMinutes: 55,
    xpReward: 95,
    blocks: [
      text(
        'A communication bus only defines how bits move. A **protocol** defines what those bits mean.'
      ),
      text(
        'A robust protocol answers questions such as: Where does a message begin? How long is it? What does each field mean? How do we detect corruption? What happens if a message is missing?'
      ),
      text(
        'A simple binary packet might contain a start byte, message type, payload length, payload, and checksum.'
      ),
      codeSample(
        'text',
        `+--------+------+--------+---------+----------+
| START  | TYPE | LENGTH | PAYLOAD | CHECKSUM |
+--------+------+--------+---------+----------+`
      ),
      text(
        'A **checksum** or **CRC** can detect many forms of corrupted data. A checksum does not magically make communication reliable; it gives the receiver evidence that a message was altered or damaged.'
      ),
      text(
        '**Timeouts** prevent a device from waiting forever for a response. **Retries** can recover from transient failures, but retry policies need limits.'
      ),
      text(
        'A protocol can also use acknowledgements: the receiver sends an ACK when a message was received successfully, or a NACK/error response when it could not process it.'
      ),
      text(
        'For asynchronous embedded systems, protocol parsing is naturally represented as a **state machine**: receive one byte, update the parser state, and continue without blocking the rest of the application.'
      ),
      callout(
        'warning',
        'Never assume communication succeeds simply because a function returned. Check status codes, acknowledgements, timeouts, and error conditions appropriate to the protocol.'
      ),
      text(
        'These ideas are what separate a prototype that works on your desk from a device that continues operating when cables are noisy, packets are corrupted, sensors disappear, or users provide unexpected input.'
      ),
    ],
    practiceProblemSlugs: ['arduino-protocol-1', 'arduino-protocol-2'],
    quizProblemSlugs: ['arduino-protocol-q1'],
    prerequisites: [{ lessonSlug: 'spi', minMasteryScore: 70 }],
  },


  {
    slug: 'communication-electrical-layer',
    unitSlug: 'communication',
    title: 'Communication at the Electrical Layer',
    summary:
      'Understand logic thresholds, pull-ups, line drivers, termination, edge rates, capacitance, differential signaling, noise margins, and signal integrity.',
    estimatedMinutes: 90,
    xpReward: 140,
    blocks: [
      text(
        'Reliable communication begins before the protocol. The receiver must physically distinguish valid logic states in the presence of resistance, capacitance, noise, and imperfect drivers.'
      ),
      text(
        'Learn **VOH, VOL, VIH, and VIL** and use them to determine whether two logic families are electrically compatible. Never infer compatibility from voltage labels alone.'
      ),
      text(
        'Study pull-up and pull-down resistors, RC rise/fall time, open-drain signaling, input capacitance, and the tradeoff between faster edges and higher current or noise.'
      ),
      text(
        'Learn why long wires behave differently from short breadboard jumpers. At sufficiently high edge rates, transmission-line effects, reflections, impedance, and termination become important.'
      ),
      text(
        'Understand **single-ended versus differential signaling**. Differential buses reject common-mode noise and can work over longer or noisier connections when implemented correctly.'
      ),
      text(
        'Introduce common interfaces such as RS-232, RS-485, and CAN at the system level. Distinguish the electrical standard from the higher-level message protocol.'
      ),
      text(
        'Learn practical signal-integrity habits: short return paths, sensible grounding, appropriate cable routing, decoupling, controlled edge rates where necessary, and verifying waveforms with an oscilloscope.'
      ),
      callout(
        'tip',
        'When a digital bus works on a breadboard but fails with a longer cable, suspect the physical layer before rewriting the protocol code.'
      ),
    ],
    practiceProblemSlugs: ['signal-integrity-1', 'signal-integrity-2', 'signal-integrity-3'],
    quizProblemSlugs: ['signal-integrity-q1', 'signal-integrity-q2'],
    prerequisites: [{ lessonSlug: 'communication-fundamentals', minMasteryScore: 70 }],
  },

  {
    slug: 'can-rs485-industrial-buses',
    unitSlug: 'communication',
    title: 'CAN, RS-485, and Robust Multi-Device Networks',
    summary:
      'Learn differential buses, arbitration, addressing, termination, transceivers, error detection, node limits, and when industrial-style communication is preferable.',
    estimatedMinutes: 90,
    xpReward: 140,
    blocks: [
      text(
        '**RS-485** is an electrical signaling standard commonly used for robust multi-drop serial networks. A transceiver converts MCU logic to differential bus signaling; the MCU still needs a protocol layered on top.'
      ),
      text(
        'Learn bus topology, twisted-pair wiring, common-mode range, termination, biasing, grounding strategy, and why arbitrary star wiring can create reflections and reliability problems.'
      ),
      text(
        '**CAN** combines a physical layer with a message-oriented protocol and robust arbitration/error mechanisms. Learn dominant and recessive bits, message identifiers, arbitration, acknowledgements, error detection, and bus-off behavior at a conceptual level.'
      ),
      text(
        'Understand the distinction between **node address**, **message identifier**, and **payload meaning**. A bus can move bits correctly while the application protocol is still wrong.'
      ),
      text(
        'Design a small multi-node system with defined message IDs, payload formats, update rates, timeouts, invalid-data handling, and node-failure behavior.'
      ),
      text(
        'Practice fault injection: disconnect a node, corrupt a message, terminate the bus incorrectly, or overload the network. The goal is to design systems that fail predictably.'
      ),
      callout(
        'warning',
        'Do not connect an MCU directly to an RS-485 or CAN physical bus unless the hardware interface explicitly supports it. These buses normally require dedicated transceivers.'
      ),
    ],
    practiceProblemSlugs: ['industrial-bus-1', 'industrial-bus-2', 'industrial-bus-3'],
    quizProblemSlugs: ['industrial-bus-q1', 'industrial-bus-q2'],
    prerequisites: [{ lessonSlug: 'communication-electrical-layer', minMasteryScore: 70 }],
  },

  {
    slug: 'wireless-systems',
    unitSlug: 'communication',
    title: 'Wireless Electronics: BLE, Wi-Fi, and RF Fundamentals',
    summary:
      'Understand wireless links from antennas and power budgets to packets, interference, range, latency, reliability, pairing, security, and regulatory constraints.',
    estimatedMinutes: 100,
    xpReward: 150,
    blocks: [
      text(
        'Wireless communication adds an RF physical layer to the digital communication concepts you already know. A packet is only useful if the receiver can reliably recover the signal.'
      ),
      text(
        'Learn frequency, wavelength, bandwidth, modulation at a conceptual level, transmit power, receiver sensitivity, antenna gain, path loss, and link budget.'
      ),
      text(
        'Understand why antenna placement, ground planes, enclosure materials, cables, nearby metal, and human proximity can change wireless performance.'
      ),
      text(
        'Compare BLE and Wi-Fi by range, throughput, power consumption, connection model, latency, and typical application. Then connect these properties to system requirements.'
      ),
      text(
        'Study interference, retries, channel selection, packet loss, congestion, roaming, sleep modes, and the difference between average throughput and worst-case latency.'
      ),
      text(
        'Wireless security is part of electronics engineering. Learn authentication, encryption, credential handling, secure provisioning, firmware updates, and minimizing exposed services.'
      ),
      text(
        'Finish with a wireless sensor design in which you specify measurement rate, radio duty cycle, latency, acceptable packet-loss rate, battery life, security requirements, and recovery behavior.'
      ),
      callout(
        'warning',
        'Wireless performance is environment-dependent. Never claim a fixed range or battery life without specifying the antenna, power mode, data rate, environment, and traffic pattern.'
      ),
    ],
    practiceProblemSlugs: ['wireless-1', 'wireless-2', 'wireless-3'],
    quizProblemSlugs: ['wireless-q1', 'wireless-q2'],
    prerequisites: [{ lessonSlug: 'can-rs485-industrial-buses', minMasteryScore: 70 }],
  },
]
