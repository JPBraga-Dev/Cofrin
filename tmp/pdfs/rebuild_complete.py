from pathlib import Path
from io import BytesIO
import re
from xml.sax.saxutils import escape
from pypdf import PdfReader
from PIL import Image as PILImage, ImageDraw
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, KeepTogether, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(r'C:\Users\jpbra\Documents\GitHub\Cofrin')
TMP=ROOT/'tmp/pdfs/complete'
OUT=ROOT/'output/pdf/Relatorio_Atividade3_Completo_formatado.pdf'
SRC=Path(r'C:\Users\jpbra\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\469CEAD367E1F5F9102716454A32DB0BEB819D91\transfers\2026-43\Relatorio_Atividade3_Completo.pdf')
TMP.mkdir(parents=True,exist_ok=True)
OUT.parent.mkdir(parents=True,exist_ok=True)
r=PdfReader(SRC)
for i,im in enumerate(r.pages[0].images):
    im.image.convert('L').save(TMP/f'figure-{i}.png')
thumb=PILImage.new('L',(900,650),255)
for i in range(6):
    im=PILImage.open(TMP/f'figure-{i}.png'); im.thumbnail((290,280))
    x=(i%3)*300;y=(i//3)*325
    thumb.paste(im,(x,y+25)); ImageDraw.Draw(thumb).text((x+10,y+5),str(i),fill=0)
thumb.save(TMP/'figures.png')

pdfmetrics.registerFont(TTFont('Arial',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold',r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic',r'C:\Windows\Fonts\ariali.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial-Italic',boldItalic='Arial-Bold')
styles={
 'body':ParagraphStyle('body',fontName='Arial',fontSize=11,leading=16,alignment=TA_JUSTIFY,spaceAfter=9),
 'h1':ParagraphStyle('h1',fontName='Arial-Bold',fontSize=14,leading=19,spaceAfter=15,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='Arial-Bold',fontSize=12,leading=17,spaceBefore=9,spaceAfter=9,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='Arial-Bold',fontSize=11,leading=16,spaceBefore=7,spaceAfter=7,keepWithNext=True),
 'center':ParagraphStyle('center',fontName='Arial',fontSize=12,leading=19,alignment=TA_CENTER),
 'cap':ParagraphStyle('cap',fontName='Arial',fontSize=9,leading=12,alignment=TA_CENTER,spaceAfter=10),
}
story=[]
def p(text,style='body'):
    story.append(Paragraph(text,styles[style]))
def fig(i,width=14.2):
    im=PILImage.open(TMP/f'figure-{i}.png')
    w=width*cm; h=w*im.height/im.width
    story.append(Image(str(TMP/f'figure-{i}.png'),width=w,height=h))
    story.append(Spacer(1,8))
def page(): story.append(PageBreak())
def footer(c,d):
    if d.page>1:
        c.setFont('Arial',9); c.drawRightString(A4[0]-2.3*cm,1.3*cm,str(d.page))

# The cover uses plain type with generous spacing and no decorative containers.
story.append(Spacer(1,8))
p('<b>FUNDAÇÃO EDSON QUEIROZ</b>','center')
p('<b>UNIVERSIDADE DE FORTALEZA</b>','center')
p('Centro de Ciências Tecnológicas','center')
p('Métodos Quantitativos em Computação','center')
story.append(Spacer(1,95))
p('<b>ATIVIDADE 3</b>','center')
story.append(Spacer(1,12))
p('<b>CORRELAÇÃO E REGRESSÃO LINEAR</b>','center')
story.append(Spacer(1,88))
p('João Pedro Braga - Matrícula 2517424','center')
p('João Pedro Eugenio Costa Rodrigues<br/>Matrícula 2513839','center')
story.append(Spacer(1,135))
p('Fortaleza - Ceará','center'); p('Outubro de 2026','center')
page()
p('SUMÁRIO','h1')
entries=[('1. Introdução','3'),('2. Análise e interpretação dos dados','3'),('    2.1 Uso do celular','3'),('    2.2 E-commerce','5'),('    2.3 Aprendizagem de máquinas','6'),('3. Conclusão','8'),('4. Referências bibliográficas','8')]
tab=Table([[Paragraph(t,styles['body']),Paragraph(n,styles['body'])] for t,n in entries],colWidths=[14.5*cm,1*cm])
tab.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
story.append(tab)
page()
p('1. INTRODUÇÃO','h1')
p('Este relatório apresenta um estudo quantitativo sobre as relações entre diferentes variáveis aplicadas a problemas reais. Utilizando os métodos de Correlação e Regressão Linear Simples, o objetivo é estabelecer modelos matemáticos que expliquem a dependência de uma variável (dependente) em relação a outra (independente). A correlação de Pearson é empregada para medir a força e a direção dessa relação linear.')
p('Avançando na complexidade, a Regressão Linear Múltipla é aplicada para avaliar o impacto simultâneo de múltiplas variáveis independentes sobre um único desfecho. Essa técnica é fundamental em Ciência de Dados para entender configurações de treinamento, evitar <i>overfitting</i> e otimizar recursos.')
p('2. ANÁLISE E INTERPRETAÇÃO DOS DADOS','h1')
p('2.1 Situação problema 1: Uso do celular','h2')
p('Com base na pesquisa de campo realizada com 20 estudantes, relacionamos o Tempo de Uso diário do celular em horas (X) e a Quantidade de Mensagens enviadas (Y).')
p('a) Gráfico de dispersão','h3')
fig(0,12.8)
page()
p('2.1 Uso do celular (continuação)','h2')
p('<b>b) Reta de regressão:</b> A equação encontrada é: Y = 33.62 + 28.59X.')
p('<b>c) Coeficiente angular:</b> O coeficiente angular (b = 28.59) indica que, em média, para cada 1 hora a mais de uso do celular, o estudante envia aproximadamente 29 mensagens adicionais. (Obs.: A presença de um <i>outlier</i> como 999 mensagens puxa a inclinação.)')
p('<b>d) Estimativas:</b> Utilizando o modelo gerado:<br/>Para 2h de uso: 90.81 mensagens.<br/>Para 4h de uso: 148.00 mensagens.<br/>Para 6h de uso: 205.19 mensagens.')
p('<b>e) Coeficientes:</b> r = 0.2805 e R² = 0.0787. O modelo explica apenas 7.87% das variações. Devido à grande variabilidade (ex.: pessoas que usam 12h enviando 10 mensagens versus pessoas usando 6h enviando 999), a correlação é considerada fraca e o modelo não explica muito bem os dados perfeitamente.')
page()
p('2.2 Situação problema 2: E-commerce','h1')
p('Nesta análise, avalia-se o impacto do investimento em marketing digital (X) no faturamento de e-commerce (Y).')
p('a) Gráfico de dispersão','h3'); fig(1,13)
p('<b>b) Tipo de relação:</b> O gráfico evidencia uma clara relação linear positiva entre o investimento e o faturamento. O crescimento de uma variável acompanha o crescimento da outra.')
p('<b>c) Coeficiente de correlação (Pearson):</b> r = 0.9996.')
p('<b>d) Intensidade:</b> Correlação positiva muito forte, quase perfeita (próxima de 1).')
p('<b>e) Interpretação:</b> O aumento do investimento em campanhas digitais está diretamente e fortemente associado ao aumento das vendas da empresa.')
p('<b>f) Coeficiente de determinação (R²):</b> R² = 0.9993. O modelo explica 99.93% das variações ocorridas no faturamento.')
p('<b>g) Estimativa de faturamento:</b> Para um investimento de R$ 50 mil, o faturamento estimado é de R$ 110.82 mil.')
page()
p('2.3 Situação problema 3: Aprendizagem de máquinas','h1')
p('2.3.1 Análise exploratória','h2')
p('Matriz de correlação','h3'); fig(2,12.5)
p('Há uma correlação forte negativa (-0.79) entre o volume de dados e o erro. As variáveis e as épocas apresentam correlações menores com o erro médio.')
p('Gráficos de dispersão','h3'); fig(3,16)
p('2.3.2 Modelo de regressão linear múltipla','h2')
p('A equação gerada pelo modelo é:')
p('<b>Erro_Medio = 23.2981 - 0.0816 × (Dados_Treino)<br/>+ 0.1966 × (Num_Variaveis) - 0.0536 × (Epocas)</b>')
page()
p('2.3.3 Qualidade do ajuste do modelo','h2')
p('<b>R²: 0.9550 | R² ajustado: 0.9498</b>')
p('Os indicadores representam que cerca de 95.50% da variância do Erro Médio é explicada pelas configurações do experimento. O R² ajustado penaliza a inclusão de variáveis desnecessárias e corrobora a robustez do modelo.')
p('2.3.4 Significância estatística','h2')
p('<b>Teste F (p-valor):</b> 1.2755e-17. Sendo menor que 0,05, o modelo global é estatisticamente válido.')
p('<b>Significância das variáveis (p-valores):</b><br/>Dados_Treino: 3.0351e-15 (Significativo)<br/>Num_Variaveis: 6.2886e-09 (Significativo)<br/>Epocas: 0.0000 (Não Significativo, &gt; 0,05)')
p('2.3.5 Importância relativa das variáveis','h2')
p('Os coeficientes padronizados revelam a real importância isolada das variáveis, contornando a diferença de escalas (milhares de registros versus dezenas de épocas):')
p('Dados_Treino: -0.7200<br/>Num_Variaveis: 0.3733<br/>Epocas: -0.3788')
p('A quantidade de Dados de Treino possui o maior peso absoluto, sendo a variável mais importante para explicar as flutuações no erro do modelo.')
page()
p('2.3.6 Previsão e avaliação','h2')
p('Para uma nova configuração com Dados de Treino = 65 mil, 12 Variáveis e 60 Épocas, o erro estimado pelo modelo é de 17.1375.')
row=[]
for i in [4,5]:
    row.append(Image(str(TMP/f'figure-{i}.png'),width=7.8*cm,height=5.2*cm))
t=Table([row],colWidths=[8*cm,8*cm]);t.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0)]));story.append(t)
p('O gráfico Real x Previsto demonstra pontos ajustados próximos à diagonal, enquanto o gráfico de resíduos apresenta dispersão aleatória sem padrões óbvios (homocedasticidade), confirmando a adequação do modelo preditivo para tomada de decisão na configuração de treinamentos.')
p('3. CONCLUSÃO','h1')
p('Este relatório comprovou a aplicabilidade prática da estatística na resolução de problemas. Na Situação 1, notamos que o uso do celular nem sempre garante alta troca de mensagens devido à dispersão dos hábitos dos alunos. Já na Situação 2, validou-se que investimentos em marketing são determinantes confiáveis para prever o faturamento do E-commerce. Por fim, no cenário de Machine Learning (Situação 3), o modelo evidenciou que obter mais dados de treino é muito mais eficaz para diminuir o erro do que adicionar épocas de treinamento, apontando diretrizes valiosas para Ciência de Dados.')
p('4. REFERÊNCIAS BIBLIOGRÁFICAS','h1')
p('MONTGOMERY, Douglas C. et al. <b>Estatística Aplicada e Probabilidade para Engenheiros.</b> 5. ed. Rio de Janeiro: LTC, 2012.')
p('Material de Apoio da Disciplina - Métodos Quantitativos em Computação. Universidade de Fortaleza, 2026.')
doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=2.5*cm,rightMargin=2.3*cm,topMargin=2.4*cm,bottomMargin=2.1*cm,title='Atividade 3 - Correlação e Regressão Linear',author='João Pedro Braga; João Pedro Eugenio Costa Rodrigues')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
print('Pages:',len(PdfReader(OUT).pages))
