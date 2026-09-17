/**
 * Medidas do card compacto (os 8 KPIs da Geral) — vivem fora do componente
 * porque o CardEventoRotativo é o mesmo card com miolo próprio e precisa das
 * mesmas classes.
 *
 * Toda medida é `min(cqw, vh)`: `cqw` (largura do próprio card, ver
 * CARD_COMPACTO_CAIXA) é o teto que impede o texto de vazar lateralmente, `vh`
 * é quem faz o card acompanhar a altura da tela. Nenhuma depende da altura do
 * card — é isso que deixa a altura do card ser o conteúdo, e não o contrário.
 */

/**
 * Passo tipográfico do número. O número é uma palavra só e não quebra: string
 * longa (moeda com milhar e centavos) cai pro passo menor pra caber na largura
 * do card em vez de estourar/ser cortada pelo overflow.
 */
export function escalaValorCompacto(value: string): string {
  if (value.length <= 4) return "text-[clamp(22px,min(27cqw,6.7vh),120px)]";
  if (value.length <= 8) return "text-[clamp(20px,min(16.2cqw,5.7vh),104px)]";
  if (value.length <= 12) return "text-[clamp(18px,min(12.6cqw,4.6vh),84px)]";
  return "text-[clamp(16px,min(9.5cqw,3.7vh),62px)]";
}

export const CARD_COMPACTO_CAIXA = "h-full min-h-[104px] [container-type:inline-size] p-[clamp(10px,min(4.4cqw,1.8vh),34px)]";
export const CARD_COMPACTO_LABEL = "text-[clamp(11px,min(5cqw,2vh),34px)] leading-none";
export const CARD_COMPACTO_META = "text-[clamp(13px,min(6.4cqw,2.7vh),44px)]";
export const CARD_COMPACTO_LEGENDA = "text-[clamp(11px,min(4.6cqw,1.9vh),32px)] leading-none";
/** Respiro entre o título e o número — metade do vão que o `mt-auto` abria antes. */
export const CARD_COMPACTO_VAO = "mt-[clamp(4px,min(7.5cqw,3.4vh),44px)]";
/** Respiro antes do rodapé (barra + legenda), que fica colado na base do card. */
export const CARD_COMPACTO_RODAPE = "mt-auto pt-[clamp(4px,min(2.3cqw,1vh),16px)]";
export const CARD_COMPACTO_BARRA = "h-[clamp(4px,min(1.7cqw,0.75vh),11px)]";
