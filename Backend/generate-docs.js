import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
} from "docx";
import fs from "fs";

const headerShading = { type: ShadingType.SOLID, color: "2E5090" };
const headerColor = "FFFFFF";
const borderStyle = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const borders = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

function createHeaderCell(text) {
  return new TableCell({
    shading: headerShading,
    borders,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: headerColor, font: "Calibri", size: 22 })] })],
  });
}

function createCell(text) {
  return new TableCell({
    borders,
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Calibri", size: 22 })] })],
  });
}

function createTable(endpoints) {
  const headerRow = new TableRow({
    children: [createHeaderCell("Método"), createHeaderCell("Ruta"), createHeaderCell("Descripción"), createHeaderCell("Auth")],
  });

  const rows = endpoints.map(
    (ep) =>
      new TableRow({
        children: [createCell(ep.method), createCell(ep.path), createCell(ep.description), createCell(ep.auth)],
      })
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

function createSectionTitle(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: 28, color: "2E5090" })],
  });
}

const modules = [
  {
    title: "Auth (/api/auth)",
    endpoints: [
      { method: "POST", path: "/register", description: "Registrar usuario", auth: "No" },
      { method: "GET", path: "/verify/:token", description: "Verificar cuenta", auth: "No" },
      { method: "POST", path: "/login", description: "Iniciar sesión", auth: "No" },
      { method: "POST", path: "/forgot-password", description: "Olvidé contraseña", auth: "No" },
      { method: "PATCH", path: "/reset-password/:token", description: "Restablecer contraseña", auth: "No" },
      { method: "GET", path: "/profile", description: "Ver perfil", auth: "Token" },
      { method: "GET", path: "/admin/users", description: "Lista de usuarios (admin)", auth: "Admin" },
      { method: "POST", path: "/learning-paths", description: "Crear ruta de aprendizaje", auth: "Admin/Teacher" },
    ],
  },
  {
    title: "Admin (/api/admin)",
    endpoints: [
      { method: "GET", path: "/users", description: "Listar usuarios", auth: "Admin" },
      { method: "POST", path: "/users", description: "Crear usuario", auth: "Admin" },
      { method: "PUT", path: "/users/:id", description: "Actualizar usuario", auth: "Admin" },
      { method: "PATCH", path: "/users/:id/status", description: "Activar/desactivar usuario", auth: "Admin" },
    ],
  },
  {
    title: "Resources (/api/resources)",
    endpoints: [
      { method: "POST", path: "/", description: "Crear recurso", auth: "Admin" },
      { method: "GET", path: "/", description: "Listar recursos", auth: "Admin/Student" },
      { method: "PUT", path: "/:id", description: "Actualizar recurso", auth: "Admin" },
      { method: "DELETE", path: "/:id", description: "Eliminar recurso", auth: "Admin" },
    ],
  },
  {
    title: "Routes (/api/routes)",
    endpoints: [
      { method: "GET", path: "/my-routes", description: "Mis rutas de aprendizaje", auth: "Token" },
      { method: "POST", path: "/:id/enroll", description: "Inscribirse a ruta", auth: "Student" },
      { method: "POST", path: "/complete-module", description: "Completar módulo", auth: "Student" },
      { method: "POST", path: "/", description: "Crear ruta", auth: "Admin" },
      { method: "GET", path: "/", description: "Listar rutas", auth: "Admin/Student" },
      { method: "PUT", path: "/:id", description: "Actualizar ruta", auth: "Admin" },
      { method: "DELETE", path: "/:id", description: "Eliminar ruta", auth: "Admin" },
      { method: "POST", path: "/generate", description: "Generar ruta personalizada", auth: "Student/Admin" },
    ],
  },
  {
    title: "Upload (/api/upload)",
    endpoints: [
      { method: "POST", path: "/", description: "Subir archivo", auth: "Admin" },
      { method: "POST", path: "/subir-portada", description: "Subir portada de ruta", auth: "No" },
      { method: "POST", path: "/profile", description: "Subir foto de perfil", auth: "Token" },
    ],
  },
  {
    title: "Chat (/api/chat)",
    endpoints: [
      { method: "POST", path: "/send", description: "Enviar mensaje", auth: "Student" },
      { method: "POST", path: "/assessment", description: "Generar evaluación", auth: "Student" },
    ],
  },
  {
    title: "Execute (/api/execute)",
    endpoints: [
      { method: "POST", path: "/run", description: "Ejecutar código", auth: "Token" },
    ],
  },
];

const children = [
  new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Documentación de Endpoints", bold: true, font: "Calibri", size: 36, color: "2E5090" })],
  }),
  new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: "Base URL: /api", font: "Calibri", size: 24, italics: true })],
  }),
];

modules.forEach((mod) => {
  children.push(createSectionTitle(mod.title));
  children.push(createTable(mod.endpoints));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
});

children.push(
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300 },
    children: [new TextRun({ text: "General", bold: true, font: "Calibri", size: 28, color: "2E5090" })],
  })
);

const generalTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ children: [createHeaderCell("Método"), createHeaderCell("Ruta"), createHeaderCell("Descripción")] }),
    new TableRow({ children: [createCell("GET"), createCell("/"), createCell("Health check")] }),
  ],
});
children.push(generalTable);

const doc = new Document({ sections: [{ children }] });

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("API_Endpoints.docx", buffer);
console.log("Archivo API_Endpoints.docx generado exitosamente");
