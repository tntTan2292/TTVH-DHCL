export default function LegendColor() {
    return (
        <div className="flex items-center gap-4 mt-4 text-xs font-medium text-gray-500 justify-end">
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span>Tốt (≥ 70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                <span>Khá (60% - 69%)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span>Cần cố gắng (50% - 59%)</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Kém (&lt; 50%)</span>
            </div>
        </div>
    );
}
