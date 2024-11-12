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
          .slice(0, 32);
  
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
        console.error('Error fetching images:', err);
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
        <div className="text-center mt-4">
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
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {images.map((image) => (
            <div
              key={image.key}
              className="relative cursor-pointer"
              onClick={() => setFullscreenMedia(image)}
            >
              <div className="w-full pb-[100%] relative overflow-hidden bg-gray-800 rounded-lg">
                {image.isVideo ? (
                  <video
                    className="absolute inset-0 w-full h-full object-contain"
                    controls
                    preload="metadata"
                  >
                    <source src={image.url} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={image.url}
                    alt={image.key}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-xs">
                {new Date(image.lastModified).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
        {fullscreenMedia && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setFullscreenMedia(null)}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                className="absolute top-2 right-2 text-white text-2xl"
                onClick={() => setFullscreenMedia(null)}
              >
                &times;
              </button>
              {fullscreenMedia.isVideo ? (
                <video
                  src={fullscreenMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full"
                />
              ) : (
                <img
                  src={fullscreenMedia.url}
                  alt=""
                  className="max-w-full max-h-full"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  