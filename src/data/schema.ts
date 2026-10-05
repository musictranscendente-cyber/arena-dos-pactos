import { z } from 'zod';

export const SIGNOS = ['aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem', 'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'] as const;
export const KEYWORDS = ['escudo', 'perfurar', 'distancia', 'vampirico', 'veneno', 'corrente', 'furia', 'investida', 'lideranca', 'carapaca', 'cura', 'reflexo', 'ascensao', 'ilusao',
  'arremetida', 'inabalavel', 'julgamento', 'ferrao', 'mira'] as const;
export const CHEGADAS = ['twin', 'face1', 'heal2', 'draw', 'volley'] as const;
export const MAGIAS = ['buff', 'shield', 'heal', 'draw', 'dmg', 'poison', 'lane', 'face'] as const;
export const RARIDADES = ['c', 'r', 'e', 'l'] as const;

const base = {
  name: z.string().min(1),
  race: z.enum(SIGNOS),
  cost: z.number().int().min(0).max(9),
  e: z.string().min(1),
  r: z.enum(RARIDADES),
  kw: z.array(z.enum(KEYWORDS)).default([]),
  art: z.string().optional(),
};

export const UnitCardSchema = z.object({
  ...base,
  type: z.literal('unit'),
  atk: z.number().int().min(0),
  hp: z.number().int().min(1),
  on: z.enum(CHEGADAS).nullable().default(null),
});

export const SpellCardSchema = z.object({
  ...base,
  type: z.literal('spell'),
  sp: z.enum(MAGIAS),
  v: z.number().int().min(0).default(0),
  a: z.number().int().min(0).default(0),
  h: z.number().int().min(0).default(0),
});

export const CardSchema = z.discriminatedUnion('type', [UnitCardSchema, SpellCardSchema]);
export const CardDbSchema = z.record(z.string(), CardSchema);

export type Signo = (typeof SIGNOS)[number];
export type Keyword = (typeof KEYWORDS)[number];
export type Chegada = (typeof CHEGADAS)[number];
export type TipoMagia = (typeof MAGIAS)[number];
export type Raridade = (typeof RARIDADES)[number];
export type UnitCard = z.infer<typeof UnitCardSchema>;
export type SpellCard = z.infer<typeof SpellCardSchema>;
export type Card = z.infer<typeof CardSchema>;
