/**
 * Medidas do card compacto (os 8 KPIs da Geral) — vivem fora do componente
 * porque o CardEventoRotativo é o mesmo card com miolo próprio e precisa das
 * mesmas classes.
 *
 * Toda medida é `min(vw, vh)`: o termo em `vw` é o teto que impede o texto de
 * vazar na largura do card (que é ~24vw, um quarto da tela no grid de 4
 * colunas), o termo em `vh` é quem faz o card acompanhar a altura da tela.
 * Nenhuma depende da altura do card — é isso que deixa a altura do card ser o
 * conteúdo, e não o contrário.
 *
 * NÃO usar `cqw`/`cqh` nem `container-type` aqui: container queries só existem
 * a partir do Chrome 105 e o browser da TV é um Chromium 94 travado, que
 * descarta a declaração inteira e derruba o `font-size` do número pro padrão —
 * era o que desmontava os cards na TV. Ver docs/plans/compat-navegador-antigo.md
 * e o guard em tests/compat-navegador-antigo.test.ts.
 */

/**
 * Passo tipográfico do número. O número é uma palavra só e não quebra: string
 * longa (moeda com milhar e centavos) cai pro passo menor pra caber na largura
 * do card em vez de estourar/ser cortada pelo overflow.
 */
export function escalaValorCompacto(value: string): string {
  if (value.length <= 4) return "text-[clamp(22px,min(6.5vw,6.7vh),120px)]";
  if (value.length <= 8) return "text-[clamp(20px,min(3.9vw,5.7vh),104px)]";
  if (value.length <= 12) return "text-[clamp(18px,min(3vw,4.6vh),84px)]";
  return "text-[clamp(16px,min(2.3vw,3.7vh),62px)]";
}

export const CARD_COMPACTO_CAIXA = "h-full min-h-[104px] p-[clamp(10px,min(1.06vw,1.8vh),34px)]";
export const CARD_COMPACTO_LABEL = "text-[clamp(11px,min(1.2vw,2vh),34px)] leading-none";
export const CARD_COMPACTO_META = "text-[clamp(13px,min(1.54vw,2.7vh),44px)]";
export const CARD_COMPACTO_LEGENDA = "text-[clamp(11px,min(1.11vw,1.9vh),32px)] leading-none";
/** Texto secundário do card de evento (data e título) e a tag de squad. */
export const CARD_COMPACTO_MIUDO = "text-[clamp(10px,min(0.96vw,1.7vh),26px)]";
/** Respiro entre o título e o número — metade do vão que o `mt-auto` abria antes. */
export const CARD_COMPACTO_VAO = "mt-[clamp(4px,min(1.8vw,3.4vh),44px)]";
/** Respiro antes do rodapé (barra + legenda), que fica colado na base do card. */
export const CARD_COMPACTO_RODAPE = "mt-auto pt-[clamp(4px,min(0.55vw,1vh),16px)]";
export const CARD_COMPACTO_BARRA = "h-[clamp(4px,min(0.41vw,0.75vh),11px)]";
