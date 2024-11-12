const MemeHistoryGraph = () => {
    const [historyData, setHistoryData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
  
    const loadTodaysCount = React.useCallback(async () => {
      try {
        const memeCount = await dynamodb.scan({
          TableName: 'Memes',
          Select: 'COUNT'
        }).promise();
  
        const today = new Date().toISOString().split('T')[0];
        
        let storedData = localStorage.getItem('memeHistory');
        let history = storedData ? JSON.parse(storedData) : [];
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        history = history.filter(item => new Date(item.date) > thirtyDaysAgo);
        
        const todayIndex = history.findIndex(item => item.date === today);
        if (todayIndex >= 0) {
          history[todayIndex].count = memeCount.Count;
        } else {
          history.push({ date: today, count: memeCount.Count });
        }
        
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('memeHistory', JSON.stringify(history));
        setHistoryData(history);
        setError(null);
      } catch (err) {
        console.error('Error loading meme history:', err);
        setError('Failed to load meme history.');
      } finally {
        setLoading(false);
      }
    }, []);
  
    React.useEffect(() => {
      let isMounted = true;
      if (isMounted) {
        loadTodaysCount();
      }
      return () => { isMounted = false; };
    }, [loadTodaysCount]);
  
    if (loading) {
      return (
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <p className="text-xl text-center text-gray-400">Loading Meme History...</p>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="bg-red-800 rounded-lg p-6 mt-6">
          <p className="text-xl text-center text-white">{error}</p>
        </div>
      );
    }
  
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-400">Meme Count History (30 Days)</h2>
        <div style={{ width: '100%', height: 300 }}>
          {historyData.length > 0 ? (
            <LineChart
              width={window.innerWidth - 100}
              height={300}
              data={historyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tickFormatter={date => new Date(date).toLocaleDateString()}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '4px'
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: '#60a5fa' }}
              />
            </LineChart>
          ) : (
            <p className="text-center text-gray-400">No data available.</p>
          )}
        </div>
      </div>
    );
  };