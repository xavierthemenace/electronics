import { create } from 'zustand';

export const DEFAULT_ARDUINO_CODE = `// Electronics Mastery Lab
// Try changing the pin numbers or adding Serial output.

const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(500);
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(500);
}`;

interface CodeState {
  sourceCode: string;
  language: 'arduino';
  dirty: boolean;
  setSourceCode: (source: string) => void;
  markSaved: () => void;
  loadSourceCode: (source?: string) => void;
}

export const useCodeStore = create<CodeState>((set) => ({
  sourceCode: DEFAULT_ARDUINO_CODE,
  language: 'arduino',
  dirty: false,
  setSourceCode: (source) => set({ sourceCode: source, dirty: true }),
  markSaved: () => set({ dirty: false }),
  loadSourceCode: (source) => set({ sourceCode: source || DEFAULT_ARDUINO_CODE, dirty: false }),
}));
