import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/jpbra/Documents/GitHub/Cofrin";
const skillDir = "C:/Users/jpbra/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations";
const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, "assets");
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
const finalPath = path.join(workspaceDir, "output", "apresentacao-cofrin-entrega.pptx");
const screenshotBytes = {
  "login.png": await fs.readFile(path.join(assets, "login.png")),
  "dashboard.png": await fs.readFile(path.join(assets, "dashboard.png")),
  "transactions.png": await fs.readFile(path.join(assets, "transactions.png")),
  "social.png": await fs.readFile(path.join(assets, "social.png")),
};

const colors = {
  bg: "#0B0C10", panel: "#15171D", line: "#2A2D36", white: "#F4F6F8",
  muted: "#A8AFBC", blue: "#2F6BFF", green: "#32C67A", red: "#FF4D4F", gold: "#F6C85F",
};
const W = 1280, H = 720;
const font = "Aptos";

function shape(slide, geometry, position, fill = "none", line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function text(slide, value, position, style = {}) {
  const block = slide.shapes.add({
    geometry: "textbox", position, fill: "none", line: { style: "solid", fill: "none", width: 0 },
  });
  block.text = value;
  block.text.style = { fontFamily: font, fontSize: 18, color: colors.white, ...style };
  block.text.insets = 0;
  return block;
}

function base(slide, part, number) {
  slide.background.fill = colors.bg;
  shape(slide, "rect", { left: 0, top: 0, width: W, height: 8 }, colors.blue);
  text(slide, part.toUpperCase(), { left: 70, top: 34, width: 250, height: 24 }, { fontSize: 12, bold: true, color: colors.blue });
  text(slide, String(number).padStart(2, "0"), { left: 1160, top: 34, width: 50, height: 24 }, { fontSize: 12, bold: true, color: colors.muted, align: "right" });
}

function title(slide, value, sub = "") {
  text(slide, value, { left: 70, top: 74, width: 890, height: 54 }, { fontSize: 34, bold: true });
  if (sub) text(slide, sub, { left: 70, top: 132, width: 940, height: 38 }, { fontSize: 17, color: colors.muted });
}

function bullet(slide, value, y, x = 90, width = 470, color = colors.white) {
  shape(slide, "ellipse", { left: x, top: y + 9, width: 7, height: 7 }, colors.blue);
  text(slide, value, { left: x + 20, top: y, width, height: 42 }, { fontSize: 18, color, breakLine: false });
}

function image(slide, file, position, alt) {
  shape(slide, "roundRect", { left: position.left - 4, top: position.top - 4, width: position.width + 8, height: position.height + 8 }, colors.panel, { style: "solid", fill: colors.line, width: 1 });
  slide.images.add({ blob: screenshotBytes[file], contentType: "image/png", alt, fit: "cover", position, geometry: "roundRect", borderRadius: "rounded-xl" });
}

function partNumber(slide, value, x, y) {
  text(slide, value, { left: x, top: y, width: 120, height: 96 }, { fontSize: 76, bold: true, color: colors.blue, align: "center" });
}

const deck = Presentation.create({ slideSize: { width: W, height: H } });

// 1. Cover
{
  const s = deck.slides.add();
  s.background.fill = colors.bg;
  shape(s, "rect", { left: 70, top: 98, width: 10, height: 350 }, colors.blue);
  text(s, "COFRIN", { left: 110, top: 112, width: 470, height: 66 }, { fontSize: 54, bold: true });
  text(s, "Gestão financeira pessoal e compartilhada", { left: 110, top: 195, width: 620, height: 55 }, { fontSize: 28, color: colors.muted });
  text(s, "Apresentação do projeto", { left: 112, top: 300, width: 420, height: 30 }, { fontSize: 18, color: colors.white });
  text(s, "10 slides organizados em 4 partes", { left: 112, top: 340, width: 420, height: 28 }, { fontSize: 16, color: colors.muted });
  text(s, "Controle financeiro com colaboração opcional", { left: 110, top: 588, width: 650, height: 28 }, { fontSize: 18, bold: true, color: colors.green });
  text(s, "01", { left: 1040, top: 520, width: 130, height: 92 }, { fontSize: 82, bold: true, color: colors.panel, align: "right" });
}

// 2. Agenda
{
  const s = deck.slides.add(); base(s, "Visão geral", 2); title(s, "Estrutura da apresentação", "Quatro partes para apresentar o propósito, as telas e a finalidade da área Social");
  const parts = [
    ["01", "Contexto", "O problema e a proposta do Cofrin"],
    ["02", "Aplicação", "Acesso, painel e lançamentos"],
    ["03", "Social", "Colaboração ligada a objetivos compartilhados"],
    ["04", "Fechamento", "Fluxo de uso e resultado esperado"],
  ];
  parts.forEach(([n, h, d], i) => {
    const x = 70 + i * 290;
    shape(s, "rect", { left: x, top: 240, width: 250, height: 240 }, colors.panel, { style: "solid", fill: colors.line, width: 1 });
    text(s, n, { left: x + 22, top: 263, width: 80, height: 36 }, { fontSize: 18, bold: true, color: colors.blue });
    text(s, h, { left: x + 22, top: 322, width: 200, height: 34 }, { fontSize: 24, bold: true });
    text(s, d, { left: x + 22, top: 376, width: 196, height: 66 }, { fontSize: 16, color: colors.muted });
  });
}

// 3. Context
{
  const s = deck.slides.add(); base(s, "Parte 1 · Contexto", 3); title(s, "Organização da vida financeira", "O Cofrin concentra informações relevantes em uma rotina de acompanhamento simples");
  partNumber(s, "01", 80, 225);
  text(s, "O projeto responde a uma necessidade direta:", { left: 250, top: 246, width: 540, height: 34 }, { fontSize: 23, bold: true });
  bullet(s, "Registrar receitas, despesas e transferências", 310, 250, 560);
  bullet(s, "Acompanhar metas, orçamentos e cartões", 365, 250, 560);
  bullet(s, "Usar grupos quando existir um objetivo em comum", 420, 250, 560);
  shape(s, "rect", { left: 860, top: 230, width: 300, height: 260 }, colors.panel, { style: "solid", fill: colors.line, width: 1 });
  text(s, "Proposta", { left: 890, top: 260, width: 200, height: 30 }, { fontSize: 18, bold: true, color: colors.green });
  text(s, "Uma aplicação que transforma registros financeiros em uma visão clara para decisões do dia a dia.", { left: 890, top: 325, width: 225, height: 110 }, { fontSize: 21, color: colors.white });
}

// 4. Login
{
  const s = deck.slides.add(); base(s, "Parte 2 · Aplicação", 4); title(s, "Acesso à plataforma", "A entrada protege o espaço financeiro do usuário antes de exibir dados pessoais");
  image(s, "login.png", { left: 610, top: 195, width: 550, height: 344 }, "Tela de login do Cofrin");
  text(s, "Login", { left: 70, top: 225, width: 350, height: 44 }, { fontSize: 28, bold: true });
  bullet(s, "Identificação por e-mail e senha", 300, 70, 430);
  bullet(s, "Recuperação de senha disponível", 365, 70, 430);
  bullet(s, "Rotas financeiras protegidas", 430, 70, 430);
  text(s, "A tela de acesso inicia uma navegação individual e segura.", { left: 70, top: 525, width: 440, height: 45 }, { fontSize: 16, color: colors.muted });
}

// 5. Dashboard
{
  const s = deck.slides.add(); base(s, "Parte 2 · Aplicação", 5); title(s, "Visão financeira em um só painel", "O dashboard reúne o resumo do período sem esconder os próximos compromissos");
  image(s, "dashboard.png", { left: 70, top: 196, width: 720, height: 450 }, "Dashboard do Cofrin");
  text(s, "Leitura rápida", { left: 850, top: 220, width: 300, height: 32 }, { fontSize: 23, bold: true });
  bullet(s, "Saldo disponível", 286, 850, 300);
  bullet(s, "Receitas e despesas", 350, 850, 300);
  bullet(s, "Orçamentos e metas", 414, 850, 300);
  text(s, "A página apoia o acompanhamento mensal com informações organizadas por prioridade.", { left: 850, top: 500, width: 300, height: 90 }, { fontSize: 17, color: colors.muted });
}

// 6. Transactions
{
  const s = deck.slides.add(); base(s, "Parte 2 · Aplicação", 6); title(s, "Lançamentos e acompanhamento mensal", "Cada movimentação fica disponível para consulta e participa dos totais exibidos no aplicativo");
  image(s, "transactions.png", { left: 570, top: 190, width: 590, height: 430 }, "Tela de lançamentos do Cofrin");
  text(s, "Uso no dia a dia", { left: 70, top: 226, width: 380, height: 36 }, { fontSize: 25, bold: true });
  bullet(s, "Registrar entradas e saídas", 300, 70, 430);
  bullet(s, "Classificar cada lançamento", 365, 70, 430);
  bullet(s, "Consultar valores e status", 430, 70, 430);
  text(s, "O histórico dá contexto aos números mostrados no painel principal.", { left: 70, top: 525, width: 420, height: 55 }, { fontSize: 17, color: colors.muted });
}

// 7. Social
{
  const s = deck.slides.add(); base(s, "Parte 3 · Social", 7); title(s, "Área Social", "Uma área voltada para pessoas, grupos e conversas relacionadas a objetivos compartilhados");
  image(s, "social.png", { left: 70, top: 198, width: 705, height: 440 }, "Tela Social do Cofrin");
  text(s, "O que ela reúne", { left: 835, top: 235, width: 300, height: 36 }, { fontSize: 24, bold: true });
  bullet(s, "Perfis e amizades", 305, 835, 305);
  bullet(s, "Grupos de planejamento", 370, 835, 305);
  bullet(s, "Conversas vinculadas", 435, 835, 305);
  text(s, "A área Social apoia a coordenação entre participantes, sem expor finanças pessoais indevidamente.", { left: 835, top: 515, width: 300, height: 90 }, { fontSize: 17, color: colors.muted });
}

// 8. Purpose of Social
{
  const s = deck.slides.add(); base(s, "Parte 3 · Social", 8); title(s, "Finalidade da área Social", "Colaboração prática para situações em que o planejamento deixa de ser individual");
  const items = [
    ["Pessoas", "Encontrar e conectar participantes para uma interação identificada."],
    ["Grupos", "Reunir pessoas que acompanham uma mesma viagem, casa ou objetivo."],
    ["Conversas", "Manter alinhamentos sobre o planejamento no contexto do grupo."],
  ];
  items.forEach(([h, d], i) => {
    const y = 230 + i * 118;
    shape(s, "rect", { left: 110, top: y, width: 1020, height: 84 }, i === 1 ? "#111E28" : colors.panel, { style: "solid", fill: colors.line, width: 1 });
    text(s, String(i + 1).padStart(2, "0"), { left: 140, top: y + 23, width: 45, height: 30 }, { fontSize: 16, bold: true, color: colors.blue });
    text(s, h, { left: 220, top: y + 19, width: 220, height: 30 }, { fontSize: 23, bold: true });
    text(s, d, { left: 480, top: y + 22, width: 580, height: 36 }, { fontSize: 17, color: colors.muted });
  });
  text(s, "A função social complementa o controle financeiro. Ela não substitui o registro individual de cada usuário.", { left: 110, top: 610, width: 1000, height: 34 }, { fontSize: 16, color: colors.green });
}

// 9. Flow
{
  const s = deck.slides.add(); base(s, "Parte 4 · Fluxo", 9); title(s, "Como usar o Cofrin", "A navegação começa com dados pessoais e inclui colaboração apenas quando ela faz sentido");
  const steps = [
    ["Acessar", "Entrar na conta"],
    ["Registrar", "Organizar lançamentos"],
    ["Acompanhar", "Ler saldos e metas"],
    ["Colaborar", "Participar de grupos"],
  ];
  steps.forEach(([h, d], i) => {
    const x = 80 + i * 286;
    shape(s, "ellipse", { left: x, top: 285, width: 80, height: 80 }, i === 3 ? colors.green : colors.blue);
    text(s, String(i + 1), { left: x, top: 302, width: 80, height: 40 }, { fontSize: 27, bold: true, align: "center" });
    text(s, h, { left: x - 20, top: 395, width: 120, height: 34 }, { fontSize: 22, bold: true, align: "center" });
    text(s, d, { left: x - 48, top: 440, width: 178, height: 42 }, { fontSize: 16, color: colors.muted, align: "center" });
    if (i < 3) shape(s, "line", { left: x + 94, top: 325, width: 165, height: 0 }, "none", { style: "solid", fill: colors.line, width: 2 });
  });
  text(s, "O uso social permanece opcional e aparece como extensão do planejamento quando há mais de uma pessoa envolvida.", { left: 180, top: 570, width: 920, height: 34 }, { fontSize: 18, color: colors.white, align: "center" });
}

// 10. Closing
{
  const s = deck.slides.add(); base(s, "Parte 4 · Encerramento", 10);
  text(s, "Cofrin", { left: 90, top: 150, width: 500, height: 62 }, { fontSize: 52, bold: true });
  text(s, "Uma aplicação para acompanhar a rotina financeira e organizar objetivos compartilhados quando necessário.", { left: 92, top: 246, width: 770, height: 78 }, { fontSize: 28, color: colors.muted });
  shape(s, "rect", { left: 92, top: 390, width: 550, height: 4 }, colors.green);
  text(s, "Financeiro pessoal", { left: 92, top: 430, width: 245, height: 30 }, { fontSize: 20, bold: true, color: colors.white });
  text(s, "Planejamento compartilhado", { left: 400, top: 430, width: 320, height: 30 }, { fontSize: 20, bold: true, color: colors.white });
  text(s, "Obrigado", { left: 92, top: 592, width: 300, height: 32 }, { fontSize: 20, color: colors.green });
  text(s, "10", { left: 1055, top: 485, width: 120, height: 100 }, { fontSize: 86, bold: true, color: colors.panel, align: "right" });
}

for (const [i, slide] of deck.slides.items.entries()) {
  slide.speakerNotes.text = `Cofrin — slide ${i + 1}. Capturas de tela produzidas no ambiente local do projeto em 14/10/2026.`;
}

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const candidatePath = path.join(stagingDir, "apresentacao-cofrin-entrega-candidate.pptx");
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
  receiptPath: path.join(stagingDir, "apresentacao-cofrin-entrega.validation.json"),
});

for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(here, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
}
