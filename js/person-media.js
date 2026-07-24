const PERSON_MEDIA = {
  P001: {
    folder: 'p001-gotzon-zubiaur',
    prefix: 'p001',
    cardPosition: '50% 34%',
    heroPosition: '50% 30%',
    memories: 6
  },
  P002: {
    folder: 'p002-jon-arostegi',
    prefix: 'p002',
    cardPosition: '50% 24%',
    heroPosition: '50% 22%',
    memories: 6
  },
  P003: {
    folder: 'p003-mikel-agirre',
    prefix: 'p003',
    cardPosition: '50% 30%',
    heroPosition: '50% 27%',
    memories: 6
  },
  P004: {
    folder: 'p004-jose-fonta',
    prefix: 'p004',
    cardPosition: '50% 28%',
    heroPosition: '50% 25%',
    memories: 3
  },
  P005: {
    folder: 'p005-josu-zubiaur',
    prefix: 'p005',
    cardPosition: '50% 30%',
    heroPosition: '50% 27%',
    memories: 3
  }
};

export function personMedia(personOrId) {
  const id = typeof personOrId === 'string' ? personOrId : personOrId?.id;
  const config = PERSON_MEDIA[id];
  if (!config) return null;

  const base = `./img/personas/${config.folder}`;
  return {
    ...config,
    cover: `${base}/${config.prefix}-portada.jpg`,
    gallery: Array.from(
      { length: config.memories },
      (_, index) => `${base}/${config.prefix}-recuerdo${index + 1}.jpg`
    )
  };
}
