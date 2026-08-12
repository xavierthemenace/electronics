import { component, project, wire, type CircuitProject } from './model.js';

export function ledArduinoTemplate(): CircuitProject {
  return project({
    name: 'Arduino LED Lab',
    components: [
      component('arduino', 'arduino-uno', {}, { x: 160, y: 180 }),
      component('supply', 'dc-source', { voltage: 5 }, { x: 160, y: 360 }),
      component('resistor', 'resistor', { resistance: 220, powerRating: 0.25 }, { x: 400, y: 180 }),
      component('led', 'led', { forwardVoltage: 2, maxForwardCurrent: 0.02 }, { x: 560, y: 180 }),
      component('ground', 'ground', {}, { x: 560, y: 330 }),
    ],
    wires: [
      wire('supply', 'plus', 'resistor', '1'), wire('resistor', '2', 'led', 'a'),
      wire('led', 'k', 'ground', 'gnd'), wire('arduino', 'd13', 'resistor', '1'),
      wire('supply', 'minus', 'ground', 'gnd'), wire('arduino', 'gnd', 'ground', 'gnd'),
    ],
  });
}

export function i2cSensorDisplayTemplate(): CircuitProject {
  return project({
    name: 'I²C Sensor + Display',
    components: [
      component('arduino', 'arduino-uno', {}, { x: 160, y: 180 }),
      component('sensor', 'i2c-temp', { address: 0x48, temperatureC: 24.5 }, { x: 430, y: 120 }),
      component('lcd', 'lcd-1602', { text: 'Temp: 24.5 C', contrast: 0.55 }, { x: 650, y: 160 }),
      component('ground', 'ground', {}, { x: 650, y: 330 }),
      component('supply', 'dc-source', { voltage: 5 }, { x: 420, y: 350 }),
    ],
    wires: [
      wire('arduino', '5v', 'sensor', 'vcc'), wire('sensor', 'gnd', 'ground', 'gnd'),
      wire('arduino', '5v', 'lcd', 'vcc'), wire('lcd', 'gnd', 'ground', 'gnd'),
      wire('arduino', 'a0', 'sensor', 'out'), wire('arduino', 'd2', 'sensor', 'sda'),
      wire('arduino', 'd3', 'sensor', 'scl'), wire('arduino', 'd4', 'lcd', 'sda'), wire('arduino', 'd5', 'lcd', 'scl'),
      wire('supply', 'plus', 'arduino', '5v'), wire('supply', 'minus', 'ground', 'gnd'),
      wire('arduino', 'gnd', 'ground', 'gnd'),
    ],
  });
}

export function closedLoopMotorTemplate(): CircuitProject {
  return project({
    name: 'Closed-Loop Motor Controller',
    components: [
      component('arduino', 'arduino-uno', {}, { x: 140, y: 190 }),
      component('motor', 'dc-motor', { windingResistance: 4, speed: 25, backEmf: 1.25 }, { x: 430, y: 160 }),
      component('sensor', 'analog-sensor', { outputVoltage: 1.25, outputResistance: 100 }, { x: 430, y: 310 }),
      component('ground', 'ground', {}, { x: 650, y: 350 }),
      component('supply', 'dc-source', { voltage: 5 }, { x: 150, y: 370 }),
    ],
    wires: [
      wire('arduino', 'd9', 'motor', 'plus'), wire('motor', 'minus', 'ground', 'gnd'),
      wire('arduino', 'a0', 'sensor', 'out'), wire('sensor', 'gnd', 'ground', 'gnd'), wire('sensor', 'vcc', 'supply', 'plus'),
      wire('supply', 'minus', 'ground', 'gnd'), wire('arduino', 'gnd', 'ground', 'gnd'), wire('supply', 'plus', 'arduino', '5v'),
    ],
  });
}

export function multiDeviceSystemTemplate(): CircuitProject {
  return project({
    name: 'Multi-Device Embedded System',
    components: [
      component('arduino', 'arduino-uno', {}, { x: 140, y: 200 }),
      component('temp', 'i2c-temp', { address: 0x48, temperatureC: 28 }, { x: 400, y: 100 }),
      component('eeprom', 'i2c-eeprom', { address: 0x50, size: 256 }, { x: 400, y: 260 }),
      component('dac', 'spi-dac', { bits: 12, code: 1024 }, { x: 650, y: 150 }),
      component('flash', 'spi-flash', { size: 1048576 }, { x: 650, y: 300 }),
      component('ground', 'ground', {}, { x: 850, y: 380 }),
      component('supply', 'dc-source', { voltage: 5 }, { x: 160, y: 390 }),
    ],
    wires: [
      wire('supply', 'plus', 'arduino', '5v'), wire('supply', 'minus', 'ground', 'gnd'), wire('arduino', 'gnd', 'ground', 'gnd'),
      wire('arduino', '5v', 'temp', 'vcc'), wire('arduino', '5v', 'eeprom', 'vcc'), wire('arduino', '5v', 'dac', 'vcc'), wire('arduino', '5v', 'flash', 'vcc'),
      wire('temp', 'gnd', 'ground', 'gnd'), wire('eeprom', 'gnd', 'ground', 'gnd'), wire('dac', 'gnd', 'ground', 'gnd'), wire('flash', 'gnd', 'ground', 'gnd'),
      wire('arduino', 'd2', 'temp', 'sda'), wire('arduino', 'd3', 'temp', 'scl'), wire('arduino', 'd2', 'eeprom', 'sda'), wire('arduino', 'd3', 'eeprom', 'scl'),
      wire('arduino', 'd9', 'dac', 'mosi'), wire('arduino', 'd8', 'dac', 'cs'), wire('arduino', 'd7', 'dac', 'sck'),
      wire('arduino', 'd9', 'flash', 'mosi'), wire('arduino', 'd8', 'flash', 'cs'), wire('arduino', 'd7', 'flash', 'sck'), wire('flash', 'miso', 'arduino', 'd6'),
    ],
  });
}
