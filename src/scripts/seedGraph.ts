// src/scripts/seedGraph.ts
import { Timestamp } from 'firebase/firestore';
import { getUserId, createGraph, createNode, createEdge } from '../services/storage';

export async function seedGraph(): Promise<void> {
  const userId = getUserId();
  const graphId = await createGraph(userId, 'Embedded Systems Sandbox');
  const now = Timestamp.now();

  const makeNode = (
    title: string,
    x: number,
    y: number,
    masteryScore: number,
    layer1: string,
    layer2?: { content: string; contentType: 'text' | 'code'; language?: string }
  ) =>
    createNode(userId, graphId, {
      title,
      position: { x, y },
      layers: [
        { depth: 1, content: layer1, contentType: 'text', createdAt: now },
        ...(layer2
          ? [{
              depth: 2,
              content: layer2.content,
              contentType: layer2.contentType,
              createdAt: now,
              ...(layer2.language ? { language: layer2.language } : {}),
            }]
          : []),
      ],
      tags: [],
      mastery: { score: masteryScore, lastReviewedAt: null, reviewCount: 0 },
      archived: false,
      clusterId: null,
      accessCount: 0,
      lastAccessedAt: null,
    });

  const [
    microcontrollerId,
    avrArchId,
    cProgId,
    gccId,
    avrdudId,
    flashId,
    gpioId,
    spiId,
    shiftRegId,
    ledMatrixId,
  ] = await Promise.all([
    makeNode('Microcontroller', 400, 50, 0.85,
      'A microcontroller is a compact integrated circuit containing a processor, memory, and I/O peripherals on a single chip.'),
    makeNode('AVR Architecture', 200, 180, 0.72,
      'AVR is an 8-bit RISC architecture by Atmel with a Harvard memory layout and simple instruction set.',
      { content: `; Flash: program memory\n; SRAM: runtime data\n; EEPROM: persistent storage`, contentType: 'code', language: 'asm' }),
    makeNode('C Programming', 600, 180, 0.90,
      'C is the primary language for embedded systems due to low-level memory access and minimal runtime overhead.'),
    makeNode('avr-gcc Compiler', 600, 320, 0.65,
      'avr-gcc is a GCC port that cross-compiles C/C++ to AVR machine code.',
      { content: `avr-gcc -mmcu=atmega328p -Os -o main.elf main.c`, contentType: 'code', language: 'bash' }),
    makeNode('avrdude', 400, 320, 0.55,
      'avrdude is a CLI utility for flashing compiled binaries onto AVR microcontrollers.'),
    makeNode('Flash Memory', 200, 320, 0.78,
      'Flash is non-volatile storage on the microcontroller that holds program code across power cycles.'),
    makeNode('GPIO Pins', 800, 180, 0.82,
      'General Purpose I/O pins let a microcontroller read digital inputs or drive outputs like LEDs.'),
    makeNode('SPI Protocol', 800, 320, 0.60,
      'SPI is a synchronous serial protocol for connecting microcontrollers to peripherals using clock, MOSI, and MISO lines.',
      { content: `SPCR = (1<<SPE)|(1<<MSTR)|(1<<SPR0);\nuint8_t spi_transfer(uint8_t data) {\n  SPDR = data;\n  while(!(SPSR & (1<<SPIF)));\n  return SPDR;\n}`, contentType: 'code', language: 'c' }),
    makeNode('74HC595 Shift Register', 700, 460, 0.45,
      'The 74HC595 is a serial-in, parallel-out shift register used to expand GPIO output pins over SPI.'),
    makeNode('8x8 LED Matrix', 700, 580, 0.30,
      'An 8x8 LED matrix is a 64-LED grid driven by shift registers to display arbitrary patterns.'),
  ]);

  await Promise.all([
    createEdge(userId, graphId, { source: microcontrollerId, target: avrArchId,   type: 'parent-child' }),
    createEdge(userId, graphId, { source: microcontrollerId, target: cProgId,     type: 'parent-child' }),
    createEdge(userId, graphId, { source: microcontrollerId, target: flashId,     type: 'parent-child' }),
    createEdge(userId, graphId, { source: microcontrollerId, target: gpioId,      type: 'parent-child' }),
    createEdge(userId, graphId, { source: cProgId,           target: gccId,       type: 'prerequisite' }),
    createEdge(userId, graphId, { source: gccId,             target: avrdudId,    type: 'sequence' }),
    createEdge(userId, graphId, { source: avrdudId,          target: flashId,     type: 'sequence' }),
    createEdge(userId, graphId, { source: gpioId,            target: spiId,       type: 'related', label: 'SPI uses GPIO' }),
    createEdge(userId, graphId, { source: spiId,             target: shiftRegId,  type: 'prerequisite' }),
    createEdge(userId, graphId, { source: shiftRegId,        target: ledMatrixId, type: 'sequence' }),
  ]);
}