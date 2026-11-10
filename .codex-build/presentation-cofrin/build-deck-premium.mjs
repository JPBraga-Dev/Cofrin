import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/jpbra/Documents/GitHub/Cofrin";
const skillDir = "C:/Users/jpbra/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations";
const here = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(here, "assets");
const stageDir = path.join(workspaceDir, ".codex-finalizer");
const finalPath = path.join(workspaceDir, "output", "apresentacao-cofrin-aprimorada-v2.pptx");
const shots = Object.fromEntries(await Promise.all(
  ["login.png", "dashboard.png", "transactions.png", "social.png"].map(async (name) => [name, await fs.readFile(path.join(assetDir, name))]),
));

const W = 1280;
const H = 720;
const font = "Aptos";
const c = {
  ink: "#0A0D14", panel: "#131822", line: "#293243", white: "#F7F9FC",
  text: "#DCE3EE", muted: "#9AA6B8", blue: "#377DFF", blueSoft: "#162A50",
  green: "#39D98A", greenSoft: "#123B2B", red: "#FF5B61", gold: "#E9C46A",
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, geometry, position, fill = "none", line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function write(slide, value, position, style = {}) {
  const block = slide.shapes.add({
    geometry: "textbox", position, fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  block.text = value;
  block.text.style = { fontFamily: font, fontSize: 18, color: c.white, ...style };
  block.text.insets = 0;
  return block;
}

function frame(slide, x, y, w, h) {
  box(slide, "roundRect", { left: x - 5, top: y - 5, width: w + 10, height: h + 10 }, c.panel, { style: "solid", fill: c.line, width: 1 });
}

function image(slide, name, x, y, w, h, alt) {
  frame(slide, x, y, w, h);
  slide.images.add({ blob: shots[name], contentType: "image/png", alt, fit: "cover", position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: "rounded-xl" });
}

function header(slide, section, number) {
  slide.background.fill = c.ink;
  box(slide, "rect", { left: 0, top: 0, width: W, height: 7 }, c.blue);
  write(slide, section.toUpperCase(), { left: 74, top: 30, width: 280, height: 22 }, { fontSize: 12, bold: true, color: c.blue });
}

function title(slide, heading, subtitle = "") {
  write(slide, heading, { left: 74, top: 78, width: 1020, height: 50 }, { fontSize: 36, bold: true });
  if (subtitle) write(slide, subtitle, { left: 74, top: 136, width: 1040, height: 32 }, { fontSize: 17, color: c.muted });
}

function index(slide, value, x, y, accent = c.blue) {
  write(slide, value, { left: x, top: y, width: 56, height: 28 }, { fontSize: 15, bold: true, color: accent });
}

function shortRule(slide, x, y, width, color = c.blue) {
  box(slide, "rect", { left: x, top: y, width, height: 4 }, color);
}

// 1. Cover
{
  const s = deck.slides.add();
  s.background.fill = c.ink;
  box(s, "rect", { left: 74, top: 104, width: 12, height: 434 }, c.blue);
  write(s, "COFRIN", { left: 118, top: 108, width: 600, height: 74 }, { fontSize: 58, bold: true });
  write(s, "Gestão financeira pessoal\ncom colaboração quando necessária", { left: 120, top: 204, width: 610, height: 100 }, { fontSize: 32, color: c.text });
  write(s, "Apresentação do projeto", { left: 120, top: 352, width: 360, height: 32 }, { fontSize: 19, color: c.white, bold: true });
  write(s, "10 slides divididos em 4 partes", { left: 120, top: 391, width: 370, height: 28 }, { fontSize: 17, color: c.muted });
  shortRule(s, 120, 470, 500, c.green);
  write(s, "14 de outubro de 2026", { left: 120, top: 500, width: 280, height: 26 }, { fontSize: 16, color: c.muted });
  write(s, "01", { left: 1025, top: 518, width: 160, height: 106 }, { fontSize: 88, bold: true, color: c.panel, align: "right" });
}

// 2. Agenda
{
  const s = deck.slides.add(); header(s, "Apresentação", 2); title(s, "Roteiro", "A apresentação parte do problema, mostra a aplicação e explica o uso colaborativo");
  const entries = [
    ["01", "Contexto", "O que o Cofrin organiza"],
    ["02", "Aplicação", "Acesso, painel e lançamentos"],
    ["03", "Social", "Pessoas, grupos e conversas"],
    ["04", "Uso", "Quando a colaboração entra"],
  ];
  entries.forEach(([n, h, d], i) => {
    const x = i % 2 === 0 ? 74 : 668;
    const y = i < 2 ? 254 : 414;
    shortRule(s, x, y, 430, i === 2 ? c.green : c.blue);
    write(s, n, { left: x, top: y + 28, width: 54, height: 26 }, { fontSize: 15, bold: true, color: i === 2 ? c.green : c.blue });
    write(s, h, { left: x + 72, top: y + 21, width: 270, height: 34 }, { fontSize: 24, bold: true });
    write(s, d, { left: x + 72, top: y + 65, width: 330, height: 30 }, { fontSize: 16, color: c.muted });
  });
  write(s, "Cofrin concentra o acompanhamento financeiro individual e estende o planejamento para grupos apenas quando existe uma necessidade compartilhada.", { left: 74, top: 590, width: 940, height: 54 }, { fontSize: 19, color: c.text });
}

// 3. Context
{
  const s = deck.slides.add(); header(s, "Parte 1 · Contexto", 3); title(s, "O que o Cofrin organiza", "A aplicação reúne o acompanhamento financeiro diário e o planejamento de objetivos");
  write(s, "A rotina financeira", { left: 74, top: 242, width: 320, height: 38 }, { fontSize: 27, bold: true });
  const statements = [
    ["Registros", "Entradas e saídas ficam disponíveis para consulta."],
    ["Visão do mês", "O painel concentra os principais valores e categorias."],
    ["Objetivos", "Porquinhos e grupos ajudam a acompanhar planos definidos."],
  ];
  statements.forEach(([h, d], i) => {
    const y = 312 + i * 104;
    index(s, `0${i + 1}`, 76, y, i === 2 ? c.green : c.blue);
    write(s, h, { left: 148, top: y - 4, width: 300, height: 28 }, { fontSize: 21, bold: true });
    write(s, d, { left: 148, top: y + 34, width: 420, height: 42 }, { fontSize: 17, color: c.muted });
  });
  box(s, "rect", { left: 667, top: 228, width: 2, height: 350 }, c.line);
  write(s, "Princípio do produto", { left: 750, top: 250, width: 340, height: 30 }, { fontSize: 18, bold: true, color: c.green });
  write(s, "Primeiro, cada pessoa registra e acompanha a própria vida financeira. A colaboração aparece como um recurso adicional para situações que envolvem outras pessoas.", { left: 750, top: 306, width: 380, height: 138 }, { fontSize: 27, color: c.text });
}

// 4. Login
{
  const s = deck.slides.add(); header(s, "Parte 2 · Aplicação", 4); title(s, "Acesso à conta", "O login organiza a entrada do usuário e prepara o carregamento do seu espaço financeiro");
  image(s, "login.png", 74, 216, 650, 360, "Tela de login do Cofrin");
  shortRule(s, 812, 250, 120, c.blue);
  write(s, "Entrada simples", { left: 812, top: 282, width: 310, height: 40 }, { fontSize: 29, bold: true });
  write(s, "O usuário acessa a conta com suas credenciais e segue diretamente para o ambiente que reúne suas informações.", { left: 812, top: 346, width: 335, height: 98 }, { fontSize: 20, color: c.text });
  write(s, "A tela mantém o foco em uma única tarefa: entrar no Cofrin.", { left: 812, top: 498, width: 320, height: 48 }, { fontSize: 17, color: c.muted });
}

// 5. Dashboard
{
  const s = deck.slides.add(); header(s, "Parte 2 · Aplicação", 5); title(s, "Visão geral", "O painel apresenta a leitura do período antes de qualquer decisão ou novo registro");
  image(s, "dashboard.png", 74, 206, 770, 433, "Painel de visão geral do Cofrin");
  write(s, "Leitura do período", { left: 920, top: 232, width: 250, height: 36 }, { fontSize: 25, bold: true });
  const lines = [
    ["Saldo", "A posição consolidada aparece logo no início."],
    ["Categorias", "A distribuição dos gastos ajuda a identificar padrões."],
    ["Movimentações", "Os registros recentes dão contexto aos totais."],
  ];
  lines.forEach(([h, d], i) => {
    const y = 312 + i * 96;
    index(s, `0${i + 1}`, 920, y, i === 2 ? c.green : c.blue);
    write(s, h, { left: 972, top: y, width: 190, height: 25 }, { fontSize: 19, bold: true });
    write(s, d, { left: 920, top: y + 32, width: 250, height: 46 }, { fontSize: 15, color: c.muted });
  });
}

// 6. Transactions
{
  const s = deck.slides.add(); header(s, "Parte 2 · Aplicação", 6); title(s, "Lançamentos", "Cada movimentação registrada compõe o histórico e participa das leituras do painel");
  write(s, "Do registro à consulta", { left: 74, top: 254, width: 360, height: 36 }, { fontSize: 27, bold: true });
  const items = [
    ["Entradas", "Recebimentos aparecem com valor e status."],
    ["Saídas", "Despesas podem ser classificadas para facilitar a leitura."],
    ["Histórico", "A lista mantém a consulta por período e categoria."],
  ];
  items.forEach(([h, d], i) => {
    const y = 326 + i * 94;
    box(s, "ellipse", { left: 75, top: y + 9, width: 10, height: 10 }, i === 1 ? c.red : c.blue);
    write(s, h, { left: 108, top: y, width: 210, height: 27 }, { fontSize: 20, bold: true });
    write(s, d, { left: 108, top: y + 33, width: 330, height: 42 }, { fontSize: 16, color: c.muted });
  });
  image(s, "transactions.png", 522, 214, 684, 385, "Lista de lançamentos do Cofrin");
}

// 7. Social
{
  const s = deck.slides.add(); header(s, "Parte 3 · Social", 7); title(s, "Área Social", "A área Social concentra as relações que apoiam objetivos compartilhados dentro do Cofrin");
  image(s, "social.png", 74, 206, 752, 423, "Área Social do Cofrin");
  shortRule(s, 898, 244, 120, c.green);
  write(s, "O que ela reúne", { left: 898, top: 278, width: 270, height: 34 }, { fontSize: 25, bold: true });
  const labels = ["Perfis e amizades", "Grupos de planejamento", "Conversas ligadas ao grupo"];
  labels.forEach((label, i) => {
    const y = 354 + i * 74;
    box(s, "ellipse", { left: 900, top: y + 8, width: 8, height: 8 }, i === 1 ? c.green : c.blue);
    write(s, label, { left: 928, top: y, width: 250, height: 30 }, { fontSize: 18, color: c.text });
  });
}

// 8. Purpose
{
  const s = deck.slides.add(); header(s, "Parte 3 · Social", 8); title(s, "Finalidade da colaboração", "O recurso Social serve a situações em que um objetivo envolve mais de uma pessoa");
  write(s, "Exemplo: uma viagem em grupo", { left: 74, top: 235, width: 470, height: 34 }, { fontSize: 26, bold: true });
  write(s, "O grupo dá contexto ao objetivo. Cada participante acompanha o planejamento sem substituir o controle financeiro individual.", { left: 74, top: 288, width: 485, height: 80 }, { fontSize: 20, color: c.text });
  const stages = [
    ["Objetivo", "O grupo se organiza em torno de uma finalidade comum."],
    ["Participação", "As pessoas envolvidas acompanham o mesmo planejamento."],
    ["Conversa", "As mensagens ficam ligadas ao contexto do grupo."],
  ];
  stages.forEach(([h, d], i) => {
    const y = 412 + i * 76;
    index(s, `0${i + 1}`, 76, y, i === 2 ? c.green : c.blue);
    write(s, h, { left: 145, top: y, width: 180, height: 27 }, { fontSize: 20, bold: true });
    write(s, d, { left: 335, top: y, width: 570, height: 42 }, { fontSize: 17, color: c.muted });
    if (i < 2) box(s, "rect", { left: 76, top: y + 55, width: 828, height: 1 }, c.line);
  });
  box(s, "rect", { left: 970, top: 225, width: 2, height: 355 }, c.line);
  write(s, "Limite claro", { left: 1030, top: 280, width: 160, height: 28 }, { fontSize: 18, bold: true, color: c.green });
  write(s, "A colaboração complementa o planejamento. Dados e registros pessoais permanecem no espaço de cada usuário.", { left: 1030, top: 336, width: 175, height: 142 }, { fontSize: 21, color: c.text });
}

// 9. Usage flow
{
  const s = deck.slides.add(); header(s, "Parte 4 · Uso", 9); title(s, "Percurso do usuário", "O Social aparece depois do acompanhamento individual, quando há uma necessidade compartilhada");
  const steps = [
    ["Acessar", "Entrar na conta"],
    ["Registrar", "Adicionar movimentações"],
    ["Acompanhar", "Consultar painel e metas"],
    ["Colaborar", "Participar de grupos"],
  ];
  steps.forEach(([h, d], i) => {
    const x = 92 + i * 286;
    box(s, "ellipse", { left: x, top: 294, width: 72, height: 72 }, i === 3 ? c.green : c.blue);
    write(s, String(i + 1), { left: x, top: 309, width: 72, height: 34 }, { fontSize: 25, bold: true, align: "center" });
    write(s, h, { left: x - 34, top: 396, width: 140, height: 30 }, { fontSize: 21, bold: true, align: "center" });
    write(s, d, { left: x - 60, top: 442, width: 190, height: 42 }, { fontSize: 16, color: c.muted, align: "center" });
    if (i < 3) box(s, "rect", { left: x + 88, top: 329, width: 176, height: 2 }, c.line);
  });
  write(s, "A colaboração mantém o planejamento conectado ao grupo, sem substituir a rotina individual de registro e consulta.", { left: 146, top: 575, width: 975, height: 32 }, { fontSize: 19, color: c.text, align: "center" });
}

// 10. Closing
{
  const s = deck.slides.add(); header(s, "Parte 4 · Encerramento", 10);
  write(s, "Cofrin", { left: 74, top: 152, width: 450, height: 66 }, { fontSize: 54, bold: true });
  write(s, "Controle financeiro pessoal\ncom uma camada de colaboração para objetivos compartilhados", { left: 74, top: 245, width: 805, height: 94 }, { fontSize: 31, color: c.text });
  shortRule(s, 74, 402, 690, c.green);
  write(s, "Financeiro individual", { left: 74, top: 444, width: 265, height: 31 }, { fontSize: 21, bold: true });
  write(s, "Grupos e conversas quando necessário", { left: 404, top: 444, width: 410, height: 31 }, { fontSize: 21, bold: true });
  write(s, "Obrigado", { left: 74, top: 590, width: 200, height: 30 }, { fontSize: 19, color: c.green });
  write(s, "10", { left: 1008, top: 510, width: 190, height: 110 }, { fontSize: 92, bold: true, color: c.panel, align: "right" });
}

for (const [i, slide] of deck.slides.items.entries()) {
  slide.speakerNotes.text = `Cofrin — slide ${i + 1}. Capturas de tela produzidas no ambiente local do projeto em 14/10/2026.`;
}

await fs.mkdir(stageDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const candidatePath = path.join(stageDir, "apresentacao-cofrin-aprimorada-v2-candidate.pptx");
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
  receiptPath: path.join(stageDir, "apresentacao-cofrin-aprimorada-v2.validation.json"),
});

