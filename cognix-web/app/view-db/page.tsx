"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ViewDBPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/view-db");
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || "Failed to load database contents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Database Contents</h1>
              <p className="text-gray-500 mt-1">
                Viewing all collections and documents
              </p>
            </div>
            <Button onClick={loadData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {loading && !data && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-gray-600">Loading database contents...</p>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="font-semibold text-blue-900 mb-2">
                  Database Info:
                </h2>
                <div className="text-sm space-y-1 text-blue-800">
                  <div>
                    <strong>Database Name:</strong> {data.databaseName}
                  </div>
                  <div>
                    <strong>Total Collections:</strong> {data.collections?.length || 0}
                  </div>
                  <div>
                    <strong>Total Documents:</strong> {data.totalDocuments || 0}
                  </div>
                </div>
              </div>

              {data.collections && data.collections.length > 0 ? (
                <div className="space-y-6">
                  {data.collections.map((collection: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">
                          {collection.name}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {collection.count} document
                          {collection.count !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="p-6">
                        {collection.documents.length > 0 ? (
                          <div className="space-y-4">
                            {collection.documents.map((doc: any, docIdx: number) => (
                              <div
                                key={docIdx}
                                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-500">
                                    Document {docIdx + 1}
                                  </span>
                                  {doc._id && (
                                    <span className="text-xs text-gray-400 font-mono">
                                      ID: {doc._id}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Special formatting for sessions collection */}
                                {collection.name === 'sessions' ? (
                                  <div className="space-y-3">
                                    <div className="bg-white p-4 rounded border border-gray-300">
                                      <h4 className="font-semibold text-gray-700 mb-2">👤 User Info</h4>
                                      <p className="text-sm"><strong>Name:</strong> {doc.userDetails?.fullName || 'N/A'}</p>
                                      <p className="text-sm"><strong>Class:</strong> {doc.userDetails?.className || 'N/A'}</p>
                                      <p className="text-sm"><strong>Timestamp:</strong> {doc.timestamp ? new Date(doc.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded border border-gray-300">
                                      <h4 className="font-semibold text-gray-700 mb-2">🤖 AI Analysis</h4>
                                      <p className="text-sm mb-2">
                                        <strong>Human Likelihood Score:</strong>{' '}
                                        <span className={`font-bold ${
                                          (doc.analysis?.score || 0) >= 70 ? 'text-green-600' :
                                          (doc.analysis?.score || 0) >= 40 ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {doc.analysis?.score || 0}%
                                        </span>
                                      </p>
                                      {doc.analysis?.reasons && doc.analysis.reasons.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-sm font-semibold mb-1">Reasons:</p>
                                          <ul className="list-disc list-inside text-sm space-y-1">
                                            {doc.analysis.reasons.map((reason: string, i: number) => (
                                              <li key={i} className="text-gray-700">{reason}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded border border-gray-300">
                                      <h4 className="font-semibold text-gray-700 mb-2">📊 Session Stats</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><strong>Total Edits:</strong> {doc.stats?.totalEditEvents || 0}</div>
                                        <div><strong>Chars Inserted:</strong> {doc.stats?.charsInserted || 0}</div>
                                        <div><strong>Chars Deleted:</strong> {doc.stats?.charsDeleted || 0}</div>
                                        <div><strong>Paste Events:</strong> {doc.stats?.pasteEventsCount || 0}</div>
                                        <div><strong>Focus Events:</strong> {doc.stats?.focusEventsCount || 0}</div>
                                        <div>
                                          <strong>Active Time:</strong>{' '}
                                          {Math.round((doc.stats?.activeTimeMs || 0) / 60000)} min
                                        </div>
                                        <div>
                                          <strong>Inactive Time:</strong>{' '}
                                          {Math.round((doc.stats?.inactiveTimeMs || 0) / 60000)} min
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <details className="bg-white p-4 rounded border border-gray-300">
                                      <summary className="font-semibold text-gray-700 cursor-pointer">
                                        📝 Raw JSON (Click to expand)
                                      </summary>
                                      <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs mt-2">
                                        {JSON.stringify(doc, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                ) : (
                                  <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
                                    {JSON.stringify(doc, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-center py-8">
                            No documents in this collection
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-lg">
                    No collections found in the database
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Create a class to add data to the database
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
