var targets = ["BANORTE (PVB MMG)", "BANORTE (PVB MECG)", "GBM (DBT-MSD MMG)", "BANORTE (MARITZA)"];
var cuentas = loadData(STORAGE_KEYS.cuentas) || [];
var rendimientos = loadData(STORAGE_KEYS.rendimientos) || [];
var c1 = cuentas.filter(function(c) { return targets.indexOf(c.nombre) > -1; });
c1.forEach(function(c) {
  var hist = (c.historial_saldos || []).slice().sort(function(a, b) { return (a.fecha || "").localeCompare(b.fecha || ""); });
  var r26 = rendimientos.filter(function(r) { return r.cuenta_id === c.id && (r.periodo || r.fecha || "").startsWith("2026"); }).sort(function(a, b) { return (a.periodo || a.fecha || "").localeCompare(b.periodo || b.fecha || ""); });
  var h26 = hist.filter(function(h) { return (h.fecha || "").startsWith("2026"); });
  console.log("--- " + c.nombre + " | hist2026=" + h26.length + " | rend2026=" + r26.length + " ---");
  hist.slice(-12).forEach(function(h) {
    console.log("  H " + h.fecha + " | sI=" + Math.round(h.saldo_inicio || 0) + " | rend=" + Math.round(h.rendimiento || 0) + " | movN=" + Math.round(h.movimientos_neto || 0));
  });
  r26.forEach(function(r) {
    console.log("  R " + r.periodo + " | sI=" + Math.round(r.saldo_inicial || 0) + " | rendM=" + Math.round(r.rendimiento_monto || 0));
  });
});
