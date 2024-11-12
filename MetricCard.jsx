const MetricCard = React.memo(({ title, value, color }) => {
    const colorClass = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      violet: 'text-violet-400',
      purple: 'text-purple-400',
      yellow: 'text-yellow-400',
      red: 'text-red-400',
      indigo: 'text-indigo-400',
      orange: 'text-orange-400',
      teal: 'text-teal-400',
      cyan: 'text-cyan-400',
      emerald: 'text-emerald-400',
      pink: 'text-pink-400',
    }[color] || 'text-white';
  
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-semibold mb-2 text-gray-400">{title}</h2>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      </div>
    );
  });