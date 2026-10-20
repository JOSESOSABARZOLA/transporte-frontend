/**
 * App: Cuadro de Colores
 * Módulo: Transporte
 * Feature: Planificar el día (flujo guiado en 4 pasos)
 * Archivo: resumenReal.fixture.ts
 * Responsabilidad: Respuesta REAL de `GET /transporte/jornada-daf/2026-10-09` (desarrollo), capturada
 *                  el 2026-10-08 con la hoja de ruta ya emitida. Solo se cambió el nombre del conductor.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-10-08
 *
 * POR QUÉ UNA RESPUESTA CAPTURADA Y NO UNA FÁBRICA. Con las hojas emitidas la pantalla abría en
 * «Preparar», y las pruebas con datos fabricados pasaban: si la forma real difiere en algo que
 * `datosDelPaso` lee, solo lo descubre una respuesta del servidor tal cual llegó.
 */

import type { ResumenJornadaDaf } from "../../../interfaces/JornadaDaf.ts";

export const RESUMEN_REAL_HOJAS_EMITIDAS: ResumenJornadaDaf = {
  "fecha": "2026-10-09",
  "pasos": {
    "pasoInicial": 4,
    "completos": {
      "1": true,
      "2": true,
      "3": true,
      "4": true
    }
  },
  "preparacion": {
    "requisitos": [
      {
        "clave": "CUADRO",
        "estado": "OK",
        "titulo": "Cuadro del día aprobado",
        "detalle": "1 operativo de 1 formulario necesita transporte.",
        "accion": null
      },
      {
        "clave": "TURNOS",
        "estado": "OK",
        "titulo": "Turnos del mes cargados",
        "detalle": "1 conductor de día, 0 de noche y 0 de libre.",
        "accion": null
      },
      {
        "clave": "CONDUCTORES",
        "estado": "OK",
        "titulo": "Datos de conductores completos",
        "detalle": "Todos tienen sector, contrato y parqueadero.",
        "accion": null
      },
      {
        "clave": "VEHICULOS",
        "estado": "OK",
        "titulo": "Vehículos confirmados: 1 sale hoy",
        "detalle": "Ninguno queda en taller.",
        "accion": {
          "tipo": "CORREGIR_VEHICULOS"
        }
      },
      {
        "clave": "VENTANA",
        "estado": "OK",
        "titulo": "Ventana de asignación abierta",
        "detalle": "Abierta hasta las 16H50.",
        "accion": null
      }
    ],
    "listos": true,
    "pendientes": 0,
    "conductoresIncompletos": []
  },
  "ventana": {
    "abierta": true,
    "horaApertura": "15:55",
    "horaCierre": "16:50",
    "mensaje": "La ventana de carga está abierta hasta las 16H50.",
    "zonaHoraria": "America/Guayaquil"
  },
  "totales": {
    "operativos": 1,
    "cubiertos": 1,
    "sinConductor": 0,
    "propiosMedios": 0,
    "conductoresEnUso": 1,
    "libresEnUso": 0,
    "vehiculosDisponibles": 1,
    "vehiculosEnUso": 1,
    "enTaller": 0,
    "avisos": 0
  },
  "operativos": [
    {
      "id": 35,
      "identificador": "OCPMO-001-09-OCT-2026",
      "formulario": "2. CONTROL DE PUNTO DE MANDO OPERATIVO (PMO)",
      "horaInicio": "08:00",
      "horaFin": "16:30",
      "zonal": "Zonal Calderón",
      "zonalId": 3,
      "tipoTransporte": "COMPLETO",
      "esMacrooperativo": false,
      "transporteLiberado": false,
      "personas": 1,
      "cubierto": true,
      "parcial": false,
      "tramos": [
        {
          "id": 18,
          "tipo": "COMPLETO",
          "horaInicio": "08:00",
          "horaFin": "16:30",
          "conductorId": 52,
          "conductor": "Conductor De Prueba",
          "vehiculoId": 40,
          "placa": "PBA-1235"
        }
      ],
      "conductores": [
        {
          "id": 52,
          "nombre": "Conductor De Prueba"
        }
      ],
      "placas": [
        "PBA-1235"
      ]
    }
  ],
  "conductores": [
    {
      "id": 52,
      "nombre": "Conductor De Prueba",
      "turno": "DIA",
      "activado": false,
      "ausente": false,
      "vehiculoId": 40,
      "placa": "PBA-1235",
      "vehiculoIds": [
        40
      ],
      "tramoIds": [
        18
      ],
      "avisos": [],
      "hojaRuta": {
        "estado": "EMITIDA",
        "emitidaEn": "2026-10-08T21:25:48.257Z"
      }
    }
  ],
  "vehiculos": {
    "flota": 1,
    "confirmada": true,
    "confirmadaEn": "2026-10-08T21:24:30.625Z",
    "lista": [
      {
        "id": 40,
        "placa": "PBA-1235",
        "tipo": null,
        "enTaller": false,
        "sale": true,
        "enUso": true
      }
    ]
  },
  "finDelDia": [
    {
      "vehiculoId": 40,
      "placa": "PBA-1235",
      "tarde": false,
      "tipo": "GARAJE",
      "ubicacionId": 3,
      "ubicacion": "Calderón",
      "conductorId": 52,
      "motivo": "Garaje autorizado más cercano a su último operativo.",
      "continuidad": "Mañana: mismo conductor y vehículo.",
      "declarada": {
        "tipo": "GARAJE",
        "ubicacion": "Calderón",
        "ubicacionId": 3,
        "conductorId": 52,
        "actaNumero": null
      },
      "avisoCombustible": true,
      "conductor": "Conductor De Prueba",
      "ultimoOperativo": {
        "identificador": "OCPMO-001-09-OCT-2026",
        "horaFin": "16:30",
        "lugar": "Zonal Calderón"
      },
      "parqueadero": {
        "autorizado": false,
        "actaVigente": false
      }
    }
  ],
  "garajes": [
    {
      "id": 3,
      "nombre": "Calderón"
    },
    {
      "id": 2,
      "nombre": "Eloy Alfaro"
    },
    {
      "id": 5,
      "nombre": "Los Chillos"
    },
    {
      "id": 1,
      "nombre": "Matriz"
    },
    {
      "id": 6,
      "nombre": "PRUEBA"
    },
    {
      "id": 4,
      "nombre": "Quitumbe"
    }
  ]
};
