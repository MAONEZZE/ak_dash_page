import { Card } from "../componentes/Card";
import { MarcadorGlobal } from "../componentes/MarcadorGlobal";

export function Financeiro() {
  return (
    <Card titulo="Financeiro" acao={<MarcadorGlobal />}>
      <p className="text-sm text-fg/70">Em breve — aguardando CSV do financeiro (ver docs/plans/dashboard-akeel.md).</p>
    </Card>
  );
}
