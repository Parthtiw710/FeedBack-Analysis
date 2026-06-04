import { Link } from "react-router-dom";

export default function LinkPage() {
  return (
    <div className="flex items-center flex-col justify-center h-screen">
        <h1 className="text-purple-300 text-2xl font-medium">
            This is the Link page
        </h1>
        <Link to="/">
            <button className="px-4 py-2 bg-indigo-900 text-white rounded">
            Go to Home Page
            </button>
        </Link>
    </div>
  );
}
