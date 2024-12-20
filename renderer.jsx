const React = require('react');
const ReactDOM = require('react-dom');
const Recharts = require('recharts');
const { LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area, ResponsiveContainer } = Recharts;
require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const RefreshIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0
         a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

const ToggleIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M4 7h16M4 17h16" />
  </svg>
);

const MetricCard = React.memo(({ title, value, color }) => {
  const gradientMap = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-green-500 to-green-700',
    violet: 'from-violet-500 to-violet-700',
    purple: 'from-purple-500 to-purple-700',
    yellow: 'from-yellow-500 to-yellow-700',
    red: 'from-red-500 to-red-700',
    indigo: 'from-indigo-500 to-indigo-700',
    orange: 'from-orange-500 to-orange-700',
    teal: 'from-teal-500 to-teal-700',
    cyan: 'from-cyan-500 to-cyan-700',
    emerald: 'from-emerald-500 to-emerald-700',
    pink: 'from-pink-500 to-pink-700',
  };

  return (
    <div className="relative bg-gray-800/40 backdrop-blur-md rounded-xl p-4 border border-gray-700/50 hover:border-gray-500 transition-all duration-300 group hover:shadow-lg overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientMap[color]} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`} />
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-gray-300 tracking-wide">{title}</span>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl font-bold text-${color}-400 tabular-nums`}>{value}</span>
      </div>
    </div>
  );
});

const Metrics = ({ refreshTrigger }) => {
  const [metrics, setMetrics] = React.useState({
    userCount: 0,
    memeCount: 0,
    activeNotificationCount: 0,
    recentCount: 0,
    storageCount: '0MB',
    interactionCount: 0,
    newUsersCount: 0,
    feedbackCount: 0,
    notificationCount: 0,
    likeCount: 0,
    commentCount: 0,
    conversationCount: 0,
    memeViewCount: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadMetrics = React.useCallback(async () => {
    try {
      const totalUsersResponse = await dynamodb.scan({ TableName: 'Profiles', Select: 'COUNT' }).promise();
      const memeDynamoResponse = await dynamodb.scan({ TableName: 'Memes', Select: 'COUNT' }).promise();
      const activeNotificationResponse = await dynamodb.scan({
        TableName: 'UserNotifications',
        FilterExpression: '#active = :false',
        ExpressionAttributeNames: { '#active': 'Active' },
        ExpressionAttributeValues: { ':false': false },
        Select: 'COUNT'
      }).promise();

      const feedbackResponse = await dynamodb.scan({
        TableName: 'UserFeedback',
        FilterExpression: '#st <> :closed',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':closed': 'closed' },
        Select: 'COUNT'
      }).promise();

      const yesterday = new Date();
      yesterday.setUTCHours(0,0,0,0);
      yesterday.setDate(yesterday.getDate() - 1);

      const newUsersResponse = await dynamodb.scan({
        TableName: 'Profiles',
        FilterExpression: 'created_at > :yesterday',
        ExpressionAttributeValues: { ':yesterday': yesterday.toISOString() },
        Select: 'COUNT'
      }).promise();

      const [
        notificationResponse,
        likeResponse,
        commentResponse,
        conversationResponse,
        interactionsResponse,
        memeViewResponse
      ] = await Promise.all([
        dynamodb.scan({ TableName: 'UserNotifications', Select: 'COUNT' }).promise(),
        dynamodb.scan({ TableName: 'UserLikes', Select: 'COUNT' }).promise(),
        dynamodb.scan({ TableName: 'Comments', Select: 'COUNT' }).promise(),
        dynamodb.scan({ TableName: 'UserConversations_v2', Select: 'COUNT' }).promise(),
        dynamodb.scan({ TableName: 'UserInteractions', Select: 'COUNT' }).promise(),
        dynamodb.scan({ TableName: 'UserMemeViews', Select: 'COUNT' }).promise()
      ]);

      let recentCount = 0;
      let totalSize = 0;
      let continuationToken = null;

      do {
        const s3Params = {
          Bucket: 'jestr-meme-uploads',
          Prefix: 'Memes/',
          MaxKeys: 1000
        };
        if (continuationToken) s3Params.ContinuationToken = continuationToken;
        const s3Response = await s3.listObjectsV2(s3Params).promise();
        const last24h = new Date(Date.now() - 86400000);
        recentCount += s3Response.Contents.filter(f => new Date(f.LastModified) > last24h).length;
        totalSize += s3Response.Contents.reduce((acc, file) => acc + file.Size, 0);
        continuationToken = s3Response.NextContinuationToken;
      } while (continuationToken);

      const storageMB = Math.round(totalSize / 1024 / 1024);
      const storageDisplay = storageMB > 1000 ? `${(storageMB / 1024).toFixed(2)}GB` : `${storageMB}MB`;

      setMetrics({
        userCount: totalUsersResponse.Count,
        memeCount: memeDynamoResponse.Count,
        activeNotificationCount: activeNotificationResponse.Count,
        recentCount,
        storageCount: storageDisplay,
        interactionCount: interactionsResponse.Count,
        newUsersCount: newUsersResponse.Count,
        feedbackCount: feedbackResponse.Count,
        notificationCount: notificationResponse.Count,
        likeCount: likeResponse.Count,
        commentCount: commentResponse.Count,
        conversationCount: conversationResponse.Count,
        memeViewCount: memeViewResponse.Count,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      setLoading(true);
      loadMetrics();
    }
    return () => { isMounted = false; };
  }, [loadMetrics, refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-4 shadow-lg mt-6">
        <p className="text-xl text-center text-gray-400">Loading Metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 rounded-lg p-4 shadow-lg mt-6">
        <p className="text-xl text-center text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-6">
      <MetricCard title="Total Users" value={metrics.userCount} color="blue" />
      <MetricCard title="Total Memes" value={metrics.memeCount} color="green" />
      <MetricCard title="Inactive Notifs" value={metrics.activeNotificationCount} color="violet" />
      <MetricCard title="Memes 24h" value={metrics.recentCount} color="purple" />
      <MetricCard title="Storage" value={metrics.storageCount} color="yellow" />
      <MetricCard title="Interactions" value={metrics.interactionCount} color="red" />
      <MetricCard title="New Users" value={`+${metrics.newUsersCount}`} color="indigo" />
      <MetricCard title="Open FB" value={metrics.feedbackCount} color="orange" />
      <MetricCard title="Notifications" value={metrics.notificationCount} color="teal" />
      <MetricCard title="Likes" value={metrics.likeCount} color="cyan" />
      <MetricCard title="Comments" value={metrics.commentCount} color="emerald" />
      <MetricCard title="Convos" value={metrics.conversationCount} color="pink" />
    </div>
  );
};

const MemeHistoryGraph = () => {
  const [historyData, setHistoryData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [chartType, setChartType] = React.useState('line');

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
    <div className="bg-gray-800/50 backdrop-blur-md rounded-lg mt-6 border border-gray-700/50 overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-300">Meme Count (30 Days)</h2>
        <button
          className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg"
          onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
        >
          <ToggleIcon />
        </button>
      </div>
      <div className="w-full h-64">
        {historyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart
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
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </LineChart>
            ) : (
              <AreaChart
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
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#60a5fa"
                  fill="#3b82f6"
                  strokeWidth={2}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-400">No data available.</p>
        )}
      </div>
    </div>
  );
};

const FullscreenModal = ({ media, onClose }) => {
  if (!media) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto" onClick={onClose}>
      <div className="relative max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-white bg-black/50 rounded-full transition duration-200"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        {media.isVideo ? (
          <video src={media.url} controls autoPlay className="max-h-screen object-contain rounded-lg shadow-2xl" />
        ) : (
          <img src={media.url} alt="" className="max-h-screen object-contain rounded-lg shadow-2xl" />
        )}
      </div>
    </div>
  );
};

const MemeGrid = () => {
  const [images, setImages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [fullscreenMedia, setFullscreenMedia] = React.useState(null);

  const fetchImages = React.useCallback(async () => {
    try {
      let allFiles = [];
      let continueToken = null;
      do {
        const params = {
          Bucket: 'jestr-meme-uploads',
          Prefix: 'Memes/',
          MaxKeys: 1000
        };
        if (continueToken) {
          params.ContinuationToken = continueToken;
        }
        const response = await s3.listObjectsV2(params).promise();
        allFiles = [...allFiles, ...response.Contents];
        continueToken = response.NextContinuationToken;
      } while (continueToken);

      const sortedFiles = allFiles
        .filter(item => !item.Key.endsWith('/'))
        .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
        .slice(0, 48);

      const imageUrls = await Promise.all(
        sortedFiles.map(async (object) => ({
          url: await s3.getSignedUrlPromise('getObject', {
            Bucket: 'jestr-meme-uploads',
            Key: object.Key,
            Expires: 3600
          }),
          key: object.Key,
          lastModified: object.LastModified,
          isVideo: object.Key.toLowerCase().endsWith('.mp4')
        }))
      );

      setImages(imageUrls);
      setError(null);
    } catch (err) {
      setError('Failed to fetch images.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchImages();
    }
    return () => { isMounted = false; };
  }, [fetchImages]);

  if (loading) {
    return (
      <div className="text-center mt-6">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800 rounded-lg p-4 shadow-lg mt-6">
        <p className="text-xl text-center text-white">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-md rounded-lg p-6 mt-6 border border-gray-700/50">
      <h2 className="text-xl font-semibold mb-4 text-gray-300">Latest Memes</h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {images.map((image) => (
          <div
            key={image.key}
            className="relative cursor-pointer group overflow-hidden rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
            onClick={() => setFullscreenMedia(image)}
          >
            <div className="w-full pb-[100%] relative bg-gray-900">
              {image.isVideo ? (
                <video className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" preload="metadata">
                  <source src={image.url} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={image.url}
                  alt={image.key}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs text-gray-300">
              {new Date(image.lastModified).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      <FullscreenModal media={fullscreenMedia} onClose={() => setFullscreenMedia(null)} />
    </div>
  );
};

const App = () => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-sans">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-md mb-6 p-6 rounded-lg border border-gray-700/50 shadow-lg">
          <button
            onClick={handleRefresh}
            className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <h1 className="text-3xl font-bold text-center tracking-wide">AWSomeDash</h1>
          <div className="w-8"></div>
        </div>
        <Metrics refreshTrigger={refreshTrigger} />
        <MemeHistoryGraph />
        <MemeGrid />
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
