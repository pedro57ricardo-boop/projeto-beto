import { Suspense } from "react";
import SchoolApp from "@/components/school-app";

export default function RoutedSchoolPage() {
  return (
    <Suspense fallback={<main className="loading-screen"><p>Carregando pagina...</p></main>}>
      <SchoolApp />
    </Suspense>
  );
}