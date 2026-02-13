
import React, { useEffect, useRef } from 'react';
import { Download, TrendingUp, TrendingDown, Star, Clock, Loader2 } from 'lucide-react';
import { Order } from '../../types';

interface DashboardOverviewProps {
  orders: Order[];
  financePeriod: string;
  setFinancePeriod: (period: any) => void;
  dreCalculations: any;
  chartData: any;
  handleExportCSV: () => void;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  orders = [], financePeriod, setFinancePeriod, dreCalculations, chartData, handleExportCSV 
}) => {
  const salesHourChartRef = useRef<HTMLCanvasElement>(null);
  const channelChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // @ts-ignore
    const Chart = window.Chart;
    if (!Chart || !chartData || !chartData.salesByHour) return;
    let charts: any[] = [];

    if (salesHourChartRef.current) {
      const ctx = salesHourChartRef.current.getContext('2d');
      if (ctx) {
        charts.push(new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.hours || [],
            datasets: [{
              label: 'Vendas (R$)',
              data: chartData.salesByHour || [],
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#1F1F23' } } } }
        }));
      }
    }

    if (channelChartRef.current) {
        const ctx = channelChartRef.current.getContext('2d');
        if (ctx) {
            charts.push(new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Delivery', 'Mesa'],
                    datasets: [{
                        data: [chartData.salesByChannel?.delivery || 0, chartData.salesByChannel?.local || 0],
                        backgroundColor: ['#f97316', '#3b82f6'],
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            }));
        }
    }

    return () => charts.forEach(c => c.destroy());
  }, [chartData]);

  if (!dreCalculations || !chartData) {
      return (
          <div className="h-full w-full flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={32} />
          </div>
      );
  }

  const handleExportCSVInternal = () => {
    const headers = ['# Pedido', 'Cliente', 'Tipo', 'Total', 'Data', 'Status'];
    const rows = orders.map(o => [
        `#${o.orderNumber || o.id.slice(0, 8)}`, 
        o.customerName, 
        o.type === 'delivery' ? 'Delivery' : 'Mesa', 
        o.total.toFixed(2), 
        new Date(o.createdAt).toLocaleDateString(), 
        o.status
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-2">
         <div className="flex gap-2">
            <select value={financePeriod} onChange={(e: any) => setFinancePeriod(e.target.value)} className="bg-[#161618] border border-white/5 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none">
                <option value="today">Hoje</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mês</option>
            </select>
         </div>
         <button onClick={handleExportCSVInternal} className="flex items-center gap-2 bg-[#161618] border border-white/5 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/5">
            <Download size={14} /> Exportar
         </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase">Faturamento</p>
          <p className="text-2xl font-bold text-white mt-1">R$ {(dreCalculations.revenue || 0).toFixed(2)}</p>
        </div>
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase">Pedidos</p>
          <p className="text-2xl font-bold text-white mt-1">{(orders || []).length}</p>
        </div>
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl">
           <p className="text-gray-400 text-xs font-bold uppercase">Lucro Líquido</p>
           <p className={`text-2xl font-bold mt-1 ${(dreCalculations.netProfit || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>R$ {(dreCalculations.netProfit || 0).toFixed(2)}</p>
        </div>
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase">Ticket Médio</p>
          <p className="text-2xl font-bold text-white mt-1">R$ {((dreCalculations.revenue || 0) / ((orders || []).length || 1)).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl h-80">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-4">Vendas por Horário</h3>
            <div className="h-64">
                <canvas ref={salesHourChartRef} />
            </div>
        </div>
        <div className="p-6 bg-[#161618] border border-white/5 rounded-2xl h-80">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-4">Canais de Venda</h3>
            <div className="h-64">
                <canvas ref={channelChartRef} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Star size={16} className="text-yellow-500" /> Top Produtos</h3>
            <div className="space-y-4">
                {(chartData.topProducts || []).map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs text-gray-300 p-2 bg-white/5 rounded-lg">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-primary font-black">{p.qty} un</span>
                    </div>
                ))}
            </div>
         </div>
         <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={16} className="text-primary" /> Info do Período</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Os dados apresentados referem-se aos pedidos finalizados dentro do período selecionado. Custos e taxas são calculados com base nas configurações da loja.</p>
         </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
