export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-950 text-white">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-4">ci-insights</h1>
        <p className="text-gray-400 text-lg mb-8">
          CI/CD Intelligence Dashboard — GitHub Actions analytics
        </p>
        <div className="grid grid-cols-2 gap-4 text-left">
          {[
            { label: "Fail Rate", desc: "Per workflow/job, 7/30 days" },
            { label: "Build Times", desc: "P50/P95 per branch & job" },
            { label: "Flaky Detection", desc: "Jobs failing >20% without code changes" },
            { label: "Historical Context", desc: "Was pipeline red before your commit?" },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="font-semibold text-blue-400">{label}</div>
              <div className="text-sm text-gray-400 mt-1">{desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-gray-600">Setting up... 🔧</p>
      </div>
    </main>
  );
}
