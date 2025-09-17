export const documentFormats = {
    "Argentina": {
        name: "Documento Nacional de Identidad (DNI)",
        format: "XX.XXX.XXX",
        regex: "^\\d{8}$",
        type: "number",
    },
    "Bolivia": {
        name: "Cédula de Identidad (CI)",
        format: "XXXXXXX",
        regex: "^\\d{7,9}$",
        type: "number",
    },
    "Chile": {
        name: "Cédula de Identidad (CI)",
        format: "XX.XXX.XXX-X",
        regex: "^\\d{8}[\\dkK]$",
        type: "text",
    },
    "Colombia": {
        name: "Cédula de Ciudadanía (CC)",
        format: "XXXXXXXXXX",
        regex: "^\\d{8,10}$",
        type: "number",
    },
    "Costa Rica": {
        name: "Cédula de Identidad",
        format: "X-XXXX-XXXX",
        regex: "^\\d{9}$",
        type: "number",
    },
    "Cuba": {
        name: "Carné de Identidad",
        format: "XXXXXXXXXXX",
        regex: "^\\d{11}$",
        type: "number",
    },
    "Ecuador": {
        name: "Cédula de Ciudadanía",
        format: "XXXXXXXXXX",
        regex: "^\\d{10}$",
        type: "number",
    },
    "El Salvador": {
        name: "Documento Único de Identidad (DUI)",
        format: "XXXXXXXX-X",
        regex: "^\\d{9}$",
        type: "number",
    },
    "España": {
        name: "Documento Nacional de Identidad (DNI)",
        format: "XXXXXXXX-X",
        regex: "^\\d{8}[A-Z]$",
        type: "text",
    },
    "Guatemala": {
        name: "Documento Personal de Identificación (DPI)",
        format: "XXXX XXXXX XXXX",
        regex: "^\\d{13}$",
        type: "number",
    },
    "Honduras": {
        name: "Tarjeta de Identidad",
        format: "XXXX-XXXX-XXXXX",
        regex: "^\\d{13}$",
        type: "number",
    },
    "México": {
        name: "Clave Única de Registro de Población (CURP)",
        format: "XXXXXXXXXXXXXXXXXX",
        regex: "^[A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$",
        type: "text",
    },
    "Nicaragua": {
        name: "Cédula de Identidad",
        format: "XXX-XXXXXX-XXXXX",
        regex: "^\\d{13}[A-Z]$",
        type: "text",
    },
    "Paraguay": {
        name: "Cédula de Identidad Civil",
        format: "X.XXX.XXX",
        regex: "^\\d{6,7}$",
        type: "number",
    },
    "Perú": {
        name: "Documento Nacional de Identidad (DNI)",
        format: "XXXXXXXX",
        regex: "^\\d{8}$",
        type: "number",
    },
    "Puerto Rico": {
        name: "Licencia de Conducir o ID del Estado",
        format: "XXXXXXXXX",
        regex: "^\\d{9}$",
        type: "number",
    },
    "República Dominicana": {
        name: "Cédula de Identidad y Electoral",
        format: "XXX-XXXXXXX-X",
        regex: "^\\d{11}$",
        type: "number",
    },
    "Uruguay": {
        name: "Cédula de Identidad",
        format: "X.XXX.XXX-X",
        regex: "^\\d{8}$",
        type: "number",
    },
    "Venezuela": {
        name: "Cédula de Identidad",
        format: "V-XX.XXX.XXX",
        regex: "^[VE]?\\d{7,8}$",
        type: "text",
    },
} as const;

export type CountryKey = keyof typeof documentFormats;
