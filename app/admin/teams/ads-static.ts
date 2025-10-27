// Métricas estáticas provisionales de ADS (derivadas de los CSV compartidos)
// Notas:
// - No dependen de rango/fechas.
// - Se muestran sólo en la pestaña "Nuevas métricas" para coaches ADS/Johan.
// - Valores pueden ajustarse cuando el backend entregue datos definitivos.

export const ADS_STATIC_METRICS = {
  // Totales/ratios aproximados derivados de una muestra (Ana, Midalys, Rocío)
  // Puedes actualizarlos con el agregado completo si lo necesitas.
  inversion: 2324, // USD
  facturacion: 5945, // USD
  roas: Number((5945 / 2324).toFixed(2)), // ≈ 2.56

  // Alcances y tráfico
  alcance: 131605,
  clics: 5379,
  visitas: 4569,

  // Embudo
  pagos_iniciados: 538,
  efectividad_ads: Number(((0.049986610729 + 0.032377210216 + 0.038547689132) / 3).toFixed(4)), // ≈ 0.0403
  efectividad_pago_iniciado: Number(((0.119825708061 + 0.019169329073 + 0.127474817645) / 3).toFixed(4)), // ≈ 0.0888
  efectividad_compra: Number(((0.025417574437 + 0 + 0.011114970476) / 3).toFixed(4)), // ≈ 0.0122

  // Estado de pauta (desconocido en el agregado)
  pauta_activa: null as boolean | null,
};

export type AdsStatic = typeof ADS_STATIC_METRICS;
