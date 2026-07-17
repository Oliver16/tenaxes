export default function ResultsNotFound() {
  return (
    <div className="max-w-md mx-auto text-center bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Not found</h1>
      <p className="text-gray-500 text-sm">
        This result page doesn&apos;t exist. The session may have expired or the link may be
        incorrect.
      </p>
    </div>
  )
}
