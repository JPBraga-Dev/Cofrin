import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/jpbra/Documents/GitHub/Cofrin";
const skillDir = "C:/Users/jpbra/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations";
const here = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(here, "assets");
const stageDir = path.join(workspaceDir, ".codex-finalizer");
const finalPath = path.join(workspaceDir, "output", "apresentacao-cofrin-editorial-v2.pptx");
const shots = Object.fromEntries(await Promise.all(
  ["login.png", "dashboard.png", "transactions.png", "social.png"].map(async (name) => [name, await fs.readFile(path.join(assetDir, name))]),
));

const W = 1280;
const H = 720;
const font = "Aptos";
const c = {
  black: "#080A0F", navy: "#0E1625", panel: "#111722", line: "#253044",
  white: "#F7F9FC", pale: "#DCE5F4", muted: "#94A2B7", blue: "#3E7CFF",
  green: "#35D38A", red: "#FF525C",
};
const deck = Presentation.create({ slideSize: { width: W, height: H } });

function shape(slide, geometry, position, fill = "none", line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function text(slide, value, position, style = {}) {
  const item = slide.shapes.add({
    geometry: "textbox", position, fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  item.text = value;
  item.text.style = { fontFamily: font, fontSize: 18, color: c.white, ...style };
  item.text.insets = 0;
  return item;
}

function image(slide, name, x, y, w, h, alt) {
  shape(slide, "roundRect", { left: x - 5, top: y - 5, width: w + 10, height: h + 10 }, c.panel, { style: "solid", fill: c.line, width: 1 });
  slide.images.add({ blob: shots[name], contentType: "image/png", alt, fit: "cover", position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: "rounded-xl" });
}

function base(slide, section) {
  slide.background.fill = c.black;
  text(slide, section, { left: 74, top: 38, width: 270, height: 22 }, { fontSize: 13, bold: true, color: c.blue });
}

function title(slide, heading, sub = "") {
  text(slide, heading, { left: 74, top: 90, width: 1100, height: 66 }, { fontSize: 46, bold: true, color: c.white });
  if (sub) text(slide, sub, { left: 77, top: 168, width: 1040, height: 40 }, { fontSize: 20, color: c.muted });
}

function rule(slide, x, y, width, color = c.blue) {
  shape(slide, "rect", { left: x, top: y, width, height: 4 }, color);
}

// 1 Cover
{
  const s = deck.slides.add();
  s.background.fill = c.black;
  shape(s, "rect", { left: 74, top: 104, width: 12, height: 470 }, c.blue);
  text(s, "COFRIN", { left: 122, top: 118, width: 580, height: 86 }, { fontSize: 70, bold: true });
  text(s, "Gestão financeira pessoal\npara decisões do dia a dia", { left: 123, top: 230, width: 675, height: 104 }, { fontSize: 33, color: c.pale });
  text(s, "Apresentação do projeto", { left: 123, top: 406, width: 280, height: 28 }, { fontSize: 19, color: c.white, bold: true });
  text(s, "10 slides em 4 partes", { left: 123, top: 446, width: 260, height: 26 }, { fontSize: 16, color: c.muted });
  rule(s, 123, 514, 500, c.green);
  text(s, "Financeiro individual. Colaboração quando necessária.", { left: 123, top: 548, width: 540, height: 26 }, { fontSize: 17, color: c.green });
}

// 2 Four parts
{
  const s = deck.slides.add(); base(s, "APRESENTAÇÃO"); title(s, "Quatro partes", "Uma leitura direta do propósito, da aplicação e do uso colaborativo");
  const list = [
    ["01", "Contexto", "O que o Cofrin organiza"],
    ["02", "Aplicação", "Login, painel e lançamentos"],
    ["03", "Social", "Pessoas, grupos e conversas"],
    ["04", "Finalidade", "Quando a colaboração faz sentido"],
  ];
  list.forEach(([n, h, d], i) => {
    const y = 250 + i * 94;
    text(s, n, { left: 76, top: y, width: 72, height: 28 }, { fontSize: 18, bold: true, color: i === 2 ? c.green : c.blue });
    text(s, h, { left: 182, top: y - 3, width: 260, height: 34 }, { fontSize: 26, bold: true });
    text(s, d, { left: 500, top: y + 1, width: 440, height: 28 }, { fontSize: 18, color: c.muted });
    if (i < 3) shape(s, "rect", { left: 76, top: y + 54, width: 1028, height: 1 }, c.line);
  });
  text(s, "A apresentação mostra primeiro o uso individual e depois a função Social, sem tratá-la como o centro do produto.", { left: 76, top: 637, width: 900, height: 28 }, { fontSize: 18, color: c.pale });
}

// 3 Context
{
  const s = deck.slides.add(); base(s, "01  CONTEXTO");
  text(s, "Acompanhamento financeiro\nsem perder o contexto", { left: 74, top: 113, width: 720, height: 138 }, { fontSize: 49, bold: true });
  rule(s, 76, 295, 390, c.blue);
  text(s, "O Cofrin concentra registros, leitura do período e metas em uma única aplicação. A pessoa começa pelo próprio planejamento e inclui outras pessoas apenas quando existe um objetivo em comum.", { left: 76, top: 336, width: 730, height: 122 }, { fontSize: 25, color: c.pale });
  text(s, "Registros", { left: 900, top: 170, width: 220, height: 28 }, { fontSize: 20, bold: true, color: c.green });
  text(s, "Entradas e saídas para consulta", { left: 900, top: 207, width: 250, height: 52 }, { fontSize: 18, color: c.muted });
  text(s, "Leitura do mês", { left: 900, top: 318, width: 220, height: 28 }, { fontSize: 20, bold: true, color: c.blue });
  text(s, "Saldo, categorias e movimentações", { left: 900, top: 355, width: 250, height: 52 }, { fontSize: 18, color: c.muted });
  text(s, "Objetivos", { left: 900, top: 466, width: 220, height: 28 }, { fontSize: 20, bold: true, color: c.white });
  text(s, "Metas pessoais e grupos quando aplicável", { left: 900, top: 503, width: 260, height: 52 }, { fontSize: 18, color: c.muted });
  shape(s, "rect", { left: 836, top: 142, width: 1, height: 446 }, c.line);
}

// 4 Login
{
  const s = deck.slides.add(); base(s, "02  APLICAÇÃO");
  text(s, "Acesso", { left: 74, top: 92, width: 300, height: 58 }, { fontSize: 45, bold: true });
  text(s, "O login mantém a entrada objetiva e direciona o usuário para o próprio ambiente financeiro.", { left: 76, top: 160, width: 650, height: 32 }, { fontSize: 20, color: c.muted });
  image(s, "login.png", 74, 238, 808, 403, "Tela de login do Cofrin");
  rule(s, 968, 294, 124, c.blue);
  text(s, "Uma tarefa\npor vez", { left: 968, top: 330, width: 210, height: 74 }, { fontSize: 32, bold: true });
  text(s, "Entrar na conta e carregar as informações ligadas ao usuário.", { left: 968, top: 436, width: 205, height: 82 }, { fontSize: 19, color: c.pale });
}

// 5 Dashboard
{
  const s = deck.slides.add(); base(s, "02  APLICAÇÃO");
  text(s, "Visão geral", { left: 74, top: 92, width: 390, height: 58 }, { fontSize: 45, bold: true });
  text(s, "Antes de registrar uma nova movimentação, o painel mostra a leitura do período.", { left: 76, top: 160, width: 680, height: 32 }, { fontSize: 20, color: c.muted });
  image(s, "dashboard.png", 74, 238, 1132, 377, "Dashboard financeiro do Cofrin");
  text(s, "Saldo", { left: 75, top: 652, width: 130, height: 24 }, { fontSize: 16, bold: true, color: c.green });
  text(s, "Categorias", { left: 326, top: 652, width: 160, height: 24 }, { fontSize: 16, bold: true, color: c.blue });
  text(s, "Movimentações recentes", { left: 584, top: 652, width: 240, height: 24 }, { fontSize: 16, bold: true, color: c.white });
}

// 6 Transactions
{
  const s = deck.slides.add(); base(s, "02  APLICAÇÃO");
  text(s, "Lançamentos", { left: 74, top: 92, width: 430, height: 58 }, { fontSize: 45, bold: true });
  text(s, "Cada movimentação registrada alimenta o histórico e participa das informações exibidas no painel.", { left: 76, top: 160, width: 875, height: 32 }, { fontSize: 20, color: c.muted });
  image(s, "transactions.png", 74, 238, 840, 392, "Lista de lançamentos do Cofrin");
  text(s, "Entradas", { left: 990, top: 274, width: 180, height: 30 }, { fontSize: 23, bold: true, color: c.green });
  text(s, "Recebimentos aparecem com valor e status.", { left: 990, top: 314, width: 190, height: 54 }, { fontSize: 18, color: c.pale });
  text(s, "Saídas", { left: 990, top: 426, width: 180, height: 30 }, { fontSize: 23, bold: true, color: c.red });
  text(s, "Despesas podem ser classificadas para facilitar a leitura do mês.", { left: 990, top: 466, width: 190, height: 74 }, { fontSize: 18, color: c.pale });
  text(s, "Histórico disponível para consulta", { left: 76, top: 660, width: 340, height: 24 }, { fontSize: 16, color: c.muted });
}

// 7 Social
{
  const s = deck.slides.add(); base(s, "03  SOCIAL");
  text(s, "Social", { left: 74, top: 92, width: 260, height: 58 }, { fontSize: 45, bold: true });
  text(s, "A área reúne as relações que ajudam pessoas a acompanhar objetivos compartilhados.", { left: 76, top: 160, width: 850, height: 32 }, { fontSize: 20, color: c.muted });
  image(s, "social.png", 74, 238, 900, 401, "Área Social do Cofrin");
  rule(s, 1040, 290, 106, c.green);
  text(s, "Pessoas", { left: 1040, top: 334, width: 160, height: 30 }, { fontSize: 23, bold: true });
  text(s, "Perfis e amizades", { left: 1040, top: 371, width: 165, height: 26 }, { fontSize: 17, color: c.pale });
  text(s, "Grupos", { left: 1040, top: 446, width: 160, height: 30 }, { fontSize: 23, bold: true });
  text(s, "Planejamentos em conjunto", { left: 1040, top: 483, width: 168, height: 45 }, { fontSize: 17, color: c.pale });
  text(s, "Conversas", { left: 1040, top: 559, width: 160, height: 30 }, { fontSize: 23, bold: true });
  text(s, "Mensagens no contexto do grupo", { left: 1040, top: 596, width: 170, height: 45 }, { fontSize: 17, color: c.pale });
}

// 8 Purpose
{
  const s = deck.slides.add(); base(s, "03  SOCIAL");
  text(s, "Quando um objetivo\npassa a ser compartilhado", { left: 74, top: 110, width: 750, height: 126 }, { fontSize: 50, bold: true });
  rule(s, 76, 284, 420, c.green);
  text(s, "A função Social dá um contexto comum para pessoas que planejam a mesma viagem, casa ou outra meta. Ela complementa o planejamento individual.", { left: 76, top: 330, width: 690, height: 96 }, { fontSize: 25, color: c.pale });
  text(s, "Objetivo comum", { left: 76, top: 508, width: 240, height: 28 }, { fontSize: 21, bold: true, color: c.green });
  text(s, "Participantes acompanham o mesmo planejamento", { left: 76, top: 546, width: 330, height: 48 }, { fontSize: 18, color: c.muted });
  text(s, "Conversa no contexto", { left: 478, top: 508, width: 270, height: 28 }, { fontSize: 21, bold: true, color: c.blue });
  text(s, "As mensagens ficam ligadas ao grupo e ao objetivo", { left: 478, top: 546, width: 330, height: 48 }, { fontSize: 18, color: c.muted });
  shape(s, "rect", { left: 882, top: 128, width: 1, height: 478 }, c.line);
  text(s, "Limite", { left: 952, top: 224, width: 180, height: 30 }, { fontSize: 22, bold: true, color: c.green });
  text(s, "Dados e registros pessoais continuam no espaço de cada usuário.", { left: 952, top: 272, width: 205, height: 132 }, { fontSize: 25, color: c.pale });
}

// 9 Boundaries
{
  const s = deck.slides.add(); base(s, "04  FINALIDADE");
  text(s, "Uso individual e colaboração", { left: 74, top: 92, width: 900, height: 58 }, { fontSize: 45, bold: true });
  text(s, "O Cofrin preserva a rotina financeira de cada pessoa e abre espaço para grupos quando necessário.", { left: 76, top: 160, width: 940, height: 32 }, { fontSize: 20, color: c.muted });
  text(s, "Individual", { left: 74, top: 290, width: 370, height: 46 }, { fontSize: 32, bold: true, color: c.white });
  rule(s, 76, 354, 416, c.blue);
  text(s, "Registros pessoais\nAcompanhamento do mês\nMetas próprias", { left: 76, top: 394, width: 350, height: 124 }, { fontSize: 24, color: c.pale });
  shape(s, "rect", { left: 635, top: 265, width: 1, height: 310 }, c.line);
  text(s, "Compartilhado", { left: 736, top: 290, width: 420, height: 46 }, { fontSize: 32, bold: true, color: c.white });
  rule(s, 738, 354, 416, c.green);
  text(s, "Grupos de planejamento\nParticipantes do objetivo\nConversas relacionadas", { left: 738, top: 394, width: 380, height: 124 }, { fontSize: 24, color: c.pale });
  text(s, "A colaboração funciona como extensão do planejamento quando a situação envolve mais de uma pessoa.", { left: 76, top: 624, width: 850, height: 28 }, { fontSize: 18, color: c.muted });
}

// 10 Closing
{
  const s = deck.slides.add();
  s.background.fill = c.black;
  text(s, "Cofrin", { left: 74, top: 144, width: 380, height: 68 }, { fontSize: 58, bold: true });
  text(s, "Uma aplicação para acompanhar\na rotina financeira com clareza.", { left: 76, top: 238, width: 720, height: 92 }, { fontSize: 34, color: c.pale });
  rule(s, 76, 397, 650, c.green);
  text(s, "Financeiro pessoal no centro.\nColaboração disponível para objetivos em comum.", { left: 76, top: 438, width: 550, height: 74 }, { fontSize: 23, color: c.white });
  text(s, "Obrigado", { left: 76, top: 602, width: 190, height: 30 }, { fontSize: 20, color: c.green });
}

for (const [i, slide] of deck.slides.items.entries()) {
  slide.speakerNotes.text = `Cofrin — slide ${i + 1}. Capturas produzidas no ambiente local do projeto em 14/10/2026.`;
}

await fs.mkdir(stageDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const candidatePath = path.join(stageDir, "apresentacao-cofrin-editorial-v2-candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidatePath);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
await finalizePresentation({
  explicitTotalSlideCount: 10,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: "C:/Users/jpbra/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stageDir, "apresentacao-cofrin-editorial-v2.validation.json"),
});

