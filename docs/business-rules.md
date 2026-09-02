# Regras financeiras

- Transferência entre contas é `TRANSFER`: move saldo, não entra como receita nem despesa.
- Uma compra no cartão já é despesa analítica. O pagamento da fatura é liquidação da obrigação, nunca uma segunda despesa.
- Aporte e retirada de porquinho sempre criam um movimento; o saldo é recalculado a partir dele na futura fonte persistente.
- Contribuição aumenta o fundo coletivo. Despesa `GROUP_FUND` reduz o fundo; despesa `MEMBER` pode formar crédito para quem pagou.
- Saldos positivos em grupo significam valor a receber; negativos, valor a pagar. O acerto guloso casa o maior devedor com o maior credor e reduz o número de transferências.
- Orçamento é saudável abaixo de 80%, em alerta de 80% a 100%, e ultrapassado acima do limite.
