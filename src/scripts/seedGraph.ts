// src/scripts/seedGraph.ts
import { Timestamp } from 'firebase/firestore';
import { getUserId, createGraph, createNode, createEdge } from '../services/storage';
import type { EdgeType } from '../types/graph';
import lgbtqIdentityVocabulary from './seedData/lgbtqIdentityVocabulary.json';

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

export async function seedLinearAlgebra(): Promise<void> {
  const userId = getUserId();
  const graphId = await createGraph(userId, 'Linear Algebra Sandbox');
  const now = Timestamp.now();

  const makeNode = (
    title: string,
    x: number,
    y: number,
    masteryScore: number,
    tags: string[],
    layer1: string,
    layer2?: { content: string; contentType: 'text' | 'code' | 'math'; language?: string; brokenVersion?: string }
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
              ...(layer2.brokenVersion ? { brokenVersion: layer2.brokenVersion } : {}),
            }]
          : []),
      ],
      tags,
      mastery: { score: masteryScore, lastReviewedAt: null, reviewCount: 0 },
      archived: false,
      clusterId: null,
      accessCount: 0,
      lastAccessedAt: null,
    });

  const [
    vectorId,
    vectorSpaceId,
    linearCombId,
    linearIndepId,
    spanId,
    basisId,
    dimensionId,
    matrixId,
    matrixOpsId,
    matrixMulId,
    identityId,
    determinantId,
    inverseId,
    transposeId,
    linearTransId,
    subspacesId,
    nullSpaceId,
    colSpaceId,
    rankId,
    eigentheoryId,
    eigenvalueId,
    eigenvectorId,
    dotProductId,
    orthogonalityId,
    gaussianId,
  ] = await Promise.all([
    makeNode('Vector', 100, 100, 0.85, ['foundation', 'geometry'],
      'A quantity with both magnitude and direction. In R^n, a vector is an ordered tuple of n real numbers, often written as a column.',
      { contentType: 'math', content: 'v = (v1, v2, ..., vn) in R^n', brokenVersion: 'v = (v1, v2, vn) in R^n' }),
    makeNode('Vector Space', 280, 100, 0.65, ['foundation'],
      'A set V closed under vector addition and scalar multiplication, satisfying eight axioms (associativity, commutativity, identity, inverse, etc.).',
      { contentType: 'math', content: '(V, +, *): for all u, v in V, a in R:  u + v in V  and  a*v in V', brokenVersion: '(V, +, *): for all u, v in V, a in R:  u + v in V  and  a + v in V' }),
    makeNode('Linear Combination', 280, 240, 0.70, ['foundation'],
      'An expression formed by scaling vectors and adding them: c1*v1 + c2*v2 + ... + cn*vn for scalars ci and vectors vi.',
      { contentType: 'math', content: 'sum_i c_i * v_i  where  c_i in R' }),
    makeNode('Linear Independence', 460, 100, 0.55, ['foundation'],
      'A set of vectors is linearly independent if no vector in the set can be written as a linear combination of the others.',
      { contentType: 'math', content: 'c1*v1 + ... + cn*vn = 0  implies  c1 = ... = cn = 0', brokenVersion: 'c1*v1 + ... + cn*vn = 0  implies  c1 = ... = cn != 0' }),
    makeNode('Span', 460, 240, 0.50, ['foundation'],
      'The set of all linear combinations of a given set of vectors. The span forms a subspace of the parent vector space.',
      { contentType: 'math', content: 'span(v1, ..., vk) = { c1*v1 + ... + ck*vk : ci in R }' }),
    makeNode('Basis', 640, 170, 0.45, ['foundation'],
      'A linearly independent set of vectors that spans a vector space. Every vector space has at least one basis.'),
    makeNode('Dimension', 820, 170, 0.60, ['foundation'],
      'The number of vectors in any basis of a vector space. All bases of a finite-dimensional space have the same size.',
      { contentType: 'math', content: 'dim(V) = |B|  where B is any basis of V' }),
    makeNode('Matrix', 100, 400, 0.80, ['matrix'],
      'A rectangular array of numbers arranged in rows and columns. An m x n matrix has m rows and n columns.',
      { contentType: 'math', content: 'A = [a_ij]  where  1 <= i <= m, 1 <= j <= n' }),
    makeNode('Matrix Operations', 100, 540, 0.75, ['matrix'],
      'Operations defined on matrices including addition, scalar multiplication, matrix multiplication, transposition, and inversion.'),
    makeNode('Matrix Multiplication', 280, 480, 0.70, ['matrix', 'computation'],
      'A binary operation defined for an m x k matrix A and a k x n matrix B, yielding an m x n product AB. Not generally commutative.',
      { contentType: 'math', content: '(AB)_ij = sum_k A_ik * B_kj', brokenVersion: '(AB)_ij = sum_k A_ij * B_kj' }),
    makeNode('Identity Matrix', 280, 620, 0.85, ['matrix'],
      'The square matrix with 1s on the diagonal and 0s elsewhere. Acts as the multiplicative identity: AI = IA = A.',
      { contentType: 'math', content: 'I = [delta_ij]  where  delta_ij = 1 if i = j, else 0' }),
    makeNode('Determinant', 460, 480, 0.40, ['matrix', 'computation'],
      'A scalar value computed from a square matrix that encodes whether the matrix is invertible (nonzero) and how it scales volume.',
      { contentType: 'math', content: 'det(A) = sum_sigma sgn(sigma) * prod_i a_i,sigma(i)', brokenVersion: 'det(A) = sum_sigma sgn(sigma) + prod_i a_i,sigma(i)' }),
    makeNode('Inverse Matrix', 460, 620, 0.35, ['matrix'],
      'A square matrix A is invertible if there exists A^-1 such that A*A^-1 = A^-1*A = I. Equivalently, det(A) != 0.',
      { contentType: 'math', content: 'A * A^-1 = A^-1 * A = I' }),
    makeNode('Transpose', 280, 760, 0.75, ['matrix'],
      'Reflecting a matrix across its main diagonal: rows become columns and vice versa. Denoted A^T.',
      { contentType: 'math', content: '(A^T)_ij = A_ji', brokenVersion: '(A^T)_ij = A_ij' }),
    makeNode('Linear Transformation', 820, 380, 0.55, ['transformation'],
      'A function T: V -> W between vector spaces preserving addition and scalar multiplication: T(au + bv) = a*T(u) + b*T(v).',
      { contentType: 'math', content: 'T(au + bv) = a*T(u) + b*T(v)', brokenVersion: 'T(au + bv) = a*T(u) + b*T(u)' }),
    makeNode('Subspaces', 640, 380, 0.50, ['foundation', 'transformation'],
      'A subset of a vector space that is itself a vector space under the inherited operations. Closed under addition and scalar multiplication.'),
    makeNode('Null Space', 820, 520, 0.30, ['transformation'],
      'The set of all vectors v that map to zero under a linear transformation T (or matrix A): {v : Av = 0}. Always a subspace.',
      { contentType: 'math', content: 'ker(A) = { v in V : A*v = 0 }' }),
    makeNode('Column Space', 1000, 520, 0.30, ['transformation'],
      'The span of the columns of a matrix A; equivalently, the image of the linear transformation x -> Ax. A subspace of the codomain.',
      { contentType: 'math', content: 'col(A) = span(a1, a2, ..., an)  where ai are columns of A' }),
    makeNode('Rank', 1000, 380, 0.35, ['matrix', 'transformation'],
      'The dimension of the column space of a matrix; equivalently, the maximum number of linearly independent columns (or rows).',
      { contentType: 'math', content: 'rank(A) = dim(col(A))', brokenVersion: 'rank(A) = dim(ker(A))' }),
    makeNode('Eigentheory', 1180, 460, 0.20, ['eigentheory'],
      'The study of eigenvalues and eigenvectors of linear operators, used in diagonalization, stability analysis, and PCA.'),
    makeNode('Eigenvalue', 1180, 600, 0.20, ['eigentheory'],
      'A scalar lambda such that A*v = lambda*v for some nonzero vector v. Roots of the characteristic polynomial det(A - lambda*I) = 0.',
      { contentType: 'math', content: 'det(A - lambda*I) = 0', brokenVersion: 'det(A + lambda*I) = 0' }),
    makeNode('Eigenvector', 1360, 600, 0.25, ['eigentheory'],
      'A nonzero vector v that, when transformed by A, becomes a scalar multiple of itself: Av = lambda*v for some scalar lambda.',
      { contentType: 'math', content: 'A * v = lambda * v,  v != 0' }),
    makeNode('Dot Product', 100, 870, 0.80, ['geometry'],
      'An operation taking two vectors and returning a scalar: u * v = sum_i u_i*v_i. Generalizes to inner products in higher dimensions.',
      { contentType: 'math', content: 'u * v = sum_i u_i * v_i', brokenVersion: 'u * v = sum_i u_i + v_i' }),
    makeNode('Orthogonality', 280, 870, 0.60, ['geometry'],
      'Two vectors are orthogonal if their dot product is zero. Generalizes the geometric notion of perpendicularity.',
      { contentType: 'math', content: 'u perp v  iff  u * v = 0' }),
    makeNode('Gaussian Elimination', 460, 760, 0.45, ['matrix', 'computation'],
      'An algorithm for solving systems of linear equations by row-reducing the augmented matrix to row echelon form via swap, scale, and replace operations.'),
  ]);

  await Promise.all([
    // parent-child
    createEdge(userId, graphId, { source: matrixOpsId,    target: matrixMulId,   type: 'parent-child' }),
    createEdge(userId, graphId, { source: matrixOpsId,    target: inverseId,     type: 'parent-child' }),
    createEdge(userId, graphId, { source: matrixOpsId,    target: transposeId,   type: 'parent-child' }),
    createEdge(userId, graphId, { source: subspacesId,    target: nullSpaceId,   type: 'parent-child' }),
    createEdge(userId, graphId, { source: subspacesId,    target: colSpaceId,    type: 'parent-child' }),
    createEdge(userId, graphId, { source: eigentheoryId,  target: eigenvalueId,  type: 'parent-child' }),
    createEdge(userId, graphId, { source: eigentheoryId,  target: eigenvectorId, type: 'parent-child' }),
    // prerequisite
    createEdge(userId, graphId, { source: vectorId,       target: vectorSpaceId,   type: 'prerequisite' }),
    createEdge(userId, graphId, { source: vectorSpaceId,  target: linearCombId,    type: 'prerequisite' }),
    createEdge(userId, graphId, { source: linearCombId,   target: spanId,          type: 'prerequisite' }),
    createEdge(userId, graphId, { source: spanId,         target: basisId,         type: 'prerequisite' }),
    createEdge(userId, graphId, { source: linearIndepId,  target: basisId,         type: 'prerequisite' }),
    createEdge(userId, graphId, { source: basisId,        target: dimensionId,     type: 'prerequisite' }),
    createEdge(userId, graphId, { source: matrixId,       target: matrixMulId,     type: 'prerequisite' }),
    createEdge(userId, graphId, { source: matrixMulId,    target: determinantId,   type: 'prerequisite' }),
    createEdge(userId, graphId, { source: matrixId,       target: identityId,      type: 'prerequisite' }),
    createEdge(userId, graphId, { source: determinantId,  target: inverseId,       type: 'prerequisite' }),
    createEdge(userId, graphId, { source: linearTransId,  target: nullSpaceId,     type: 'prerequisite' }),
    createEdge(userId, graphId, { source: linearTransId,  target: colSpaceId,      type: 'prerequisite' }),
    createEdge(userId, graphId, { source: nullSpaceId,    target: rankId,          type: 'prerequisite' }),
    createEdge(userId, graphId, { source: colSpaceId,     target: rankId,          type: 'prerequisite' }),
    createEdge(userId, graphId, { source: matrixId,       target: eigenvalueId,    type: 'prerequisite' }),
    createEdge(userId, graphId, { source: eigenvalueId,   target: eigenvectorId,   type: 'prerequisite' }),
    createEdge(userId, graphId, { source: vectorId,       target: dotProductId,    type: 'prerequisite' }),
    createEdge(userId, graphId, { source: dotProductId,   target: orthogonalityId, type: 'prerequisite' }),
    createEdge(userId, graphId, { source: matrixId,       target: gaussianId,      type: 'prerequisite' }),
    createEdge(userId, graphId, { source: gaussianId,     target: rankId,          type: 'prerequisite' }),
    // related
    createEdge(userId, graphId, { source: linearTransId,  target: matrixId,        type: 'related' }),
    createEdge(userId, graphId, { source: identityId,     target: inverseId,       type: 'related' }),
    createEdge(userId, graphId, { source: determinantId,  target: eigenvalueId,    type: 'related' }),
    createEdge(userId, graphId, { source: rankId,         target: dimensionId,     type: 'related' }),
    createEdge(userId, graphId, { source: gaussianId,     target: inverseId,       type: 'related' }),
    // sequence
    createEdge(userId, graphId, { source: vectorId,       target: matrixId,        type: 'sequence' }),
    createEdge(userId, graphId, { source: matrixId,       target: linearTransId,   type: 'sequence' }),
    createEdge(userId, graphId, { source: linearTransId,  target: eigentheoryId,   type: 'sequence' }),
  ]);
}

type SeedLayer = {
  depth: number;
  content: string;
  contentType: 'text' | 'code' | 'math';
  createdAt: string;
  language?: string;
  brokenVersion?: string;
};

type SeedNode = {
  id: string;
  title: string;
  position: { x: number; y: number };
  layers: SeedLayer[];
  tags: string[];
  mastery: { score: number; reviewCount: number };
  archived: boolean;
  clusterId: string | null;
  accessCount: number;
};

type SeedEdge = {
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
};

export async function seedLgbtqIdentityVocabulary(): Promise<void> {
  const seed = lgbtqIdentityVocabulary as {
    metadata: { name: string };
    nodes: SeedNode[];
    edges: SeedEdge[];
  };

  const userId = getUserId();
  const graphId = await createGraph(userId, seed.metadata.name);
  const nodeMap = new Map<string, string>();

  for (const node of seed.nodes) {
    const createdNodeId = await createNode(userId, graphId, {
      title: node.title,
      position: node.position,
      layers: node.layers.map((layer) => ({
        depth: layer.depth,
        content: layer.content,
        contentType: layer.contentType,
        createdAt: Timestamp.fromDate(new Date(layer.createdAt)),
        ...(layer.language ? { language: layer.language } : {}),
        ...(layer.brokenVersion ? { brokenVersion: layer.brokenVersion } : {}),
      })),
      tags: node.tags,
      mastery: {
        score: node.mastery.score,
        lastReviewedAt: null,
        reviewCount: node.mastery.reviewCount,
      },
      archived: node.archived,
      clusterId: node.clusterId,
      accessCount: node.accessCount,
      lastAccessedAt: null,
    });
    nodeMap.set(node.id, createdNodeId);
  }

  for (const edge of seed.edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) continue;
    await createEdge(userId, graphId, {
      source,
      target,
      type: edge.type,
      ...(edge.label ? { label: edge.label } : {}),
    });
  }
}