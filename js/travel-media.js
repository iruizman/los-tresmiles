const TRAVEL_MEDIA = {
  V003: { file: 'v003-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V004: { file: 'v004-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V005: { file: 'v005-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V006: { file: 'V006-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V007: { file: 'V007-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V008: { file: 'V008-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V009: { file: 'v009-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V010: { file: 'v010-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V011: { file: 'v011-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' },
  V012: { file: 'v012-portada.jpg', cardPosition: '50% 50%', heroPosition: '50% 50%' }
};

export function travelMedia(tripOrId) {
  const id = typeof tripOrId === 'string' ? tripOrId : tripOrId?.id;
  const config = TRAVEL_MEDIA[id];
  if (!config) return null;

  return {
    ...config,
    cover: `./img/viajes/${config.file}`
  };
}
