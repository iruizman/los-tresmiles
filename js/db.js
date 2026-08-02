function normalizeColumnName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function firstValue(row, candidates) {
  // Primero intentamos la coincidencia exacta.
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, key) && String(row[key] ?? "").trim() !== "") {
      return String(row[key]).trim();
    }
  }

  // Después aceptamos pequeñas variaciones de cabecera de Google Sheets:
  // guiones, espacios, guiones bajos, mayúsculas y tildes.
  const normalizedEntries = new Map(
    Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value])
  );

  for (const key of candidates) {
    const value = normalizedEntries.get(normalizeColumnName(key));
    if (String(value ?? "").trim() !== "") return String(value).trim();
  }

  return "";
}

function normalizeId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseDateEs(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function fullName(person) {
  return [person.nombre, person.apellido].filter(Boolean).join(" ").trim();
}

export function buildDatabase(raw) {
  const cumbres = raw.cumbres.map((row) => ({
    id: normalizeId(firstValue(row, ["ID_CUMBRE", "Id_Cumbre"])),
    nombre: firstValue(row, ["Nombre", "NOMBRE"]),
    nombreAlternativo: firstValue(row, ["Nombre_alternativo", "Nombre alternativo"]),
    altitud: Number(firstValue(row, ["Altitud", "ALTITUD"])) || null,
    latitud: normalizeCoordinate(firstValue(row, ["Latitud", "LATITUD"])),
    longitud: normalizeCoordinate(firstValue(row, ["Longitud", "LONGITUD"])),
    macizo: firstValue(row, ["Macizo", "MACIZO"]),
    zonaUIAA: firstValue(row, ["Zona_UIAA", "Zona UIAA"]),
    pais: firstValue(row, ["País", "Pais", "PAÍS"]),
    tipo: firstValue(row, ["Tipo", "TIPO"]),
    orden212: firstValue(row, ["Orden_212", "Orden 212"]),
    original: row
  }));

  const viajes = raw.viajes.map((row) => ({
    id: normalizeId(firstValue(row, ["ID_VIAJE"])),
    nombre: firstValue(row, ["Nombre", "NOMBRE"]),
    fechaInicio: firstValue(row, ["Fecha_inicio"]),
    fechaFin: firstValue(row, ["Fecha_fin"]),
    fechaInicioDate: parseDateEs(firstValue(row, ["Fecha_inicio"])),
    fechaFinDate: parseDateEs(firstValue(row, ["Fecha_fin"])),
    zonaPrincipal: firstValue(row, ["Zona_principal"]),
    base: firstValue(row, ["Base"]),
    pais: firstValue(row, ["País", "Pais"]),
    alojamiento: firstValue(row, ["Alojamiento"]),
    urlAlojamiento: firstValue(row, ["URL_alojam", "URL alojamiento", "URL_Alojamiento"]),
    descripcion: firstValue(row, ["Descripción", "Descripcion"]),
    tracks: [1, 2, 3].map((number) => ({
      url: firstValue(row, [`Track${number}`]),
      titulo: firstValue(row, [
        `Track${number}_titulo`,
        `Track${number}_título`,
        `Track${number}-titulo`,
        `Track${number}-título`
      ])
    })).filter((track) => track.url),
    album: firstValue(row, ["Álbum_fotos", "Album_fotos"]),
    video: firstValue(row, ["Vídeo", "Video"]),
    meteorologia: firstValue(row, ["Meteorología", "Meteorologia"]),
    notas: firstValue(row, ["Notas"]),
    original: row
  }));

  const personas = raw.personas.map((row) => ({
    id: normalizeId(firstValue(row, ["ID_PERSONA"])),
    nombre: firstValue(row, ["NOMBRE", "Nombre"]),
    apellido: firstValue(row, ["APELLIDO", "Apellido"]),
    alias: firstValue(row, ["ALIAS", "Alias"]),
    nombreCompleto: "",
    original: row
  }));
  personas.forEach((person) => {
    person.nombreCompleto = fullName(person);
  });

  const cumbresById = new Map(cumbres.map((item) => [item.id, item]));
  const viajesById = new Map(viajes.map((item) => [item.id, item]));
  const personasById = new Map(personas.map((item) => [item.id, item]));

  const personIdsByAscent = new Map();
  raw.ascensionesPersonas.forEach((row) => {
    const ascentId = normalizeId(firstValue(row, ["ID_ASCENSIONES", "ID_ASCENSION"]));
    const personId = normalizeId(firstValue(row, ["ID_PERSONA"]));
    if (!personIdsByAscent.has(ascentId)) personIdsByAscent.set(ascentId, []);
    personIdsByAscent.get(ascentId).push(personId);
  });

  const ascensiones = raw.ascensiones.map((row) => {
    const id = normalizeId(firstValue(row, ["ID_ASCENSIONES", "ID_ASCENSION"]));
    const idCumbre = normalizeId(firstValue(row, ["ID_CUMBRE"]));
    const idViaje = normalizeId(firstValue(row, ["ID_VIAJE", "Viaje"]));
    const personIds = personIdsByAscent.get(id) ?? [];

    return {
      id,
      idCumbre,
      idViaje,
      fecha: firstValue(row, ["Fecha", "FECHA"]),
      fechaDate: parseDateEs(firstValue(row, ["Fecha", "FECHA"])),
      nombre: firstValue(row, ["Nombre", "NOMBRE"]),
      altitud: Number(firstValue(row, ["Altitud", "ALTITUD"])) || null,
      integrantesTexto: firstValue(row, ["Integrantes"]),
      puntoSalida: firstValue(row, ["Punto salida", "Punto_salida"]),
      alojamiento: firstValue(row, ["Alojamiento"]),
      track: firstValue(row, ["Track"]),
      fotos: firstValue(row, ["Fotos"]),
      notas: firstValue(row, ["Notas"]),
      cumbre: cumbresById.get(idCumbre) ?? null,
      viaje: viajesById.get(idViaje) ?? null,
      personas: personIds.map((personId) => personasById.get(personId)).filter(Boolean),
      original: row
    };
  });

  const ascensionesByCumbre = new Map();
  ascensiones.forEach((ascent) => {
    if (!ascensionesByCumbre.has(ascent.idCumbre)) ascensionesByCumbre.set(ascent.idCumbre, []);
    ascensionesByCumbre.get(ascent.idCumbre).push(ascent);
  });

  cumbres.forEach((summit) => {
    summit.ascensiones = ascensionesByCumbre.get(summit.id) ?? [];
    summit.ascendida = summit.ascensiones.length > 0;
  });

  viajes.forEach((trip) => {
    trip.ascensiones = ascensiones.filter((ascent) => ascent.idViaje === trip.id);
    trip.cumbres = trip.ascensiones.map((ascent) => ascent.cumbre).filter(Boolean);
  });

  personas.forEach((person) => {
    person.ascensiones = ascensiones.filter((ascent) =>
      ascent.personas.some((item) => item.id === person.id)
    );
  });

  const warnings = [];
  ascensiones.forEach((ascent) => {
    if (!ascent.cumbre) warnings.push(`${ascent.id}: cumbre ${ascent.idCumbre} no encontrada`);
    if (ascent.idViaje && !ascent.viaje) warnings.push(`${ascent.id}: viaje ${ascent.idViaje} no encontrado`);
  });
  cumbres.forEach((summit) => {
    if (summit.latitud === null || summit.longitud === null) warnings.push(`${summit.id}: coordenadas incompletas`);
  });

  return {
    cumbres,
    ascensiones,
    viajes,
    personas,
    ascensionesPersonas: raw.ascensionesPersonas,
    indexes: { cumbresById, viajesById, personasById, ascensionesByCumbre },
    stats: {
      totalCumbres: cumbres.length,
      cumbresAscendidas: cumbres.filter((item) => item.ascendida).length,
      ascensiones: ascensiones.length,
      viajes: viajes.length,
      personas: personas.length
    },
    warnings
  };
}


export function buildGr11Database(raw) {
  const refugios = (raw.refugios ?? []).map((row) => ({
    id: normalizeId(firstValue(row, ["ID_REFUGIO"])),
    nombre: firstValue(row, ["NOMBRE", "Nombre"]),
    tipo: firstValue(row, ["TIPO", "Tipo"]),
    localidad: firstValue(row, ["LOCALIDAD", "Localidad"]),
    provincia: firstValue(row, ["PROVINCIA", "Provincia"]),
    comunidad: firstValue(row, ["COMUNIDAD", "Comunidad"]),
    pais: firstValue(row, ["PAIS", "PAÍS", "País"]),
    altitud: Number(firstValue(row, ["ALTITUD"])) || null,
    latitud: normalizeCoordinate(firstValue(row, ["LATITUD"])),
    longitud: normalizeCoordinate(firstValue(row, ["LONGITUD"])),
    telefono: firstValue(row, ["TELEFONO", "TELÉFONO"]),
    telefono2: firstValue(row, ["TELEFONO2", "TELEFONO_2"]),
    email: firstValue(row, ["EMAIL"]),
    web: firstValue(row, ["WEB"]),
    reservasUrl: firstValue(row, ["RESERVAS_URL", "RESERVAS URL"]),
    mapsUrl: firstValue(row, ["URL_MAPS", "URL MAPS"]),
    plazas: firstValue(row, ["PLAZAS"]),
    guardado: firstValue(row, ["GUARDADO"]),
    abierto: firstValue(row, ["ABIERTO"]),
    precioMp: firstValue(row, ["PRECIO_MP"]),
    precioPc: firstValue(row, ["PRECIO_PC"]),
    servicios: firstValue(row, ["SERVICIOS"]),
    contacto: firstValue(row, ["CONTACTO"]),
    observaciones: firstValue(row, ["OBSERVACIONES"]),
    original: row
  })).filter((item) => item.id);

  const refugiosById = new Map(refugios.map((item) => [item.id, item]));

  const jornadas = (raw.jornadas ?? []).map((row) => ({
    id: normalizeId(firstValue(row, ["ID_JORNADA"])),
    idCampana: normalizeId(firstValue(row, ["ID_CAMPANA"])),
    numero: Number(firstValue(row, ["NUM_JORNADA"])) || null,
    fecha: firstValue(row, ["FECHA"]),
    idEtapaPlan: normalizeId(firstValue(row, ["ID_ETAPA_PLAN"])),
    estado: firstValue(row, ["ESTADO"]),
    idEtapaReal: normalizeId(firstValue(row, ["ID_ETAPA_REAL"])),
    original: row
  })).filter((item) => item.id || item.idEtapaPlan || item.idEtapaReal);

  const completedWords = ["completada", "realizada", "completa"];
  const plannedWords = ["planificada", "preparada", "en curso", "en ruta"];
  const normalized = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  function statusForStage(stageId) {
    const related = jornadas.filter((j) => j.idEtapaPlan === stageId || j.idEtapaReal === stageId);
    if (related.some((j) => completedWords.some((word) => normalized(j.estado).includes(word)))) return "realizada";
    if (related.some((j) => plannedWords.some((word) => normalized(j.estado).includes(word)))) return "planificada";
    return "pendiente";
  }

  const etapas = (raw.etapas ?? []).map((row) => {
    const id = normalizeId(firstValue(row, ["ID_ETAPA"]));
    const idRefugio = normalizeId(firstValue(row, ["ID_REFUGIO_FINAL"]));
    return {
      id,
      numero: Number(firstValue(row, ["NUM_ETAPA"])) || null,
      nombre: firstValue(row, ["NOMBRE", "Nombre"]),
      inicio: firstValue(row, ["INICIO"]),
      altitudInicio: Number(firstValue(row, ["ALTITUD_INICIO"])) || null,
      provinciaInicio: firstValue(row, ["PROVINCIA_INICIO"]),
      final: firstValue(row, ["FINAL"]),
      altitudFinal: Number(firstValue(row, ["ALTITUD_FINAL"])) || null,
      provinciaFinal: firstValue(row, ["PROVINCIA_FINAL"]),
      distanciaKm: normalizeCoordinate(firstValue(row, ["DISTANCIA_KM"])),
      desnivelPos: Number(firstValue(row, ["DESNIVEL_POS"])) || null,
      desnivelNeg: Number(firstValue(row, ["DESNIVEL_NEG"])) || null,
      tiempoEstimado: firstValue(row, ["TIEMPO_ESTIMADO"]),
      dificultad: firstValue(row, ["DIFICULTAD"]),
      idRefugioFinal: idRefugio,
      trackReferencia: firstValue(row, ["TRACK_REFERENCIA"]),
      mapaUrl: firstValue(row, ["MAPA_URL"]),
      descripcion: firstValue(row, ["DESCRIPCION", "DESCRIPCIÓN"]),
      observaciones: firstValue(row, ["OBSERVACIONES"]),
      refugio: refugiosById.get(idRefugio) ?? null,
      estado: statusForStage(id),
      original: row
    };
  }).filter((item) => item.id).sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));

  const etapasById = new Map(etapas.map((item) => [item.id, item]));
  return {
    etapas, refugios, jornadas,
    campanas: raw.campanas ?? [],
    jornadasPersonas: raw.jornadasPersonas ?? [],
    indexes: { etapasById, refugiosById },
    stats: {
      total: etapas.length,
      realizadas: etapas.filter((item) => item.estado === "realizada").length,
      planificadas: etapas.filter((item) => item.estado === "planificada").length,
      pendientes: etapas.filter((item) => item.estado === "pendiente").length,
      refugios: refugios.length
    }
  };
}
