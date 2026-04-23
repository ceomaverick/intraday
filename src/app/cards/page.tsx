import WeeklyTrackerHeader from "@/components/WeeklyTrackerHeader";
import WeeklyTrackerCards from "@/components/WeeklyTrackerCards";

export default function CardsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <WeeklyTrackerHeader />
      <main className="px-6 py-8">
        <WeeklyTrackerCards />
      </main>
    </div>
  );
}
