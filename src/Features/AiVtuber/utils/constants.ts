// Mao motion definitions
export const MAO_MOTIONS = {
    IDLE: { group: "Idle", index: 0 }, // 대기
    TAP_BODY_1: { group: "", index: 0 }, // mtn_02
    TAP_BODY_2: { group: "", index: 1 }, // mtn_03
    TAP_BODY_3: { group: "", index: 2 }, // mtn_04
    SPECIAL_HEART: { group: "", index: 3 }, // special_01 (하트/폭발)
    SPECIAL_RABBIT_AURA: { group: "", index: 4 }, // special_02 (토끼/오라)
    SPECIAL_RABBIT_MAGIC: { group: "", index: 5 }, // special_03 (토끼 마술)
} as const;

export type MaoMotionKey = keyof typeof MAO_MOTIONS;
