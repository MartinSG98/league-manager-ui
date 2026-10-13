import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

import { CareerLayout } from "./pages/CareerLayout";
import { ClubScreen } from "./screens/ClubScreen";
import { NewCareerPage } from "./pages/NewCareerPage";
import { TitlePage } from "./pages/TitlePage";
import { CompetitionScreen } from "./screens/CompetitionScreen";
import { CompetitionsScreen } from "./screens/CompetitionsScreen";
import { DraftScreen } from "./screens/DraftScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { InboxScreen } from "./screens/InboxScreen";
import { MatchDetailScreen } from "./screens/MatchDetailScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { MetaScreen } from "./screens/MetaScreen";
import { PlayerScreen } from "./screens/PlayerScreen";
import { PlayersScreen } from "./screens/PlayersScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { SquadScreen } from "./screens/SquadScreen";
import { StaffScreen } from "./screens/StaffScreen";
import { TrainingScreen } from "./screens/TrainingScreen";
import { TransfersScreen } from "./screens/TransfersScreen";
import { CareerProvider } from "./state/career";
import { CatalogProvider } from "./state/catalog";

function Career() {
  const { id } = useParams();
  return (
    <CareerProvider id={id!}>
      <CareerLayout />
    </CareerProvider>
  );
}

export default function App() {
  return (
    <CatalogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TitlePage />} />
          <Route path="/new" element={<NewCareerPage />} />
          <Route path="/career/:id" element={<Career />}>
            <Route index element={<HomeScreen />} />
            <Route path="draft" element={<DraftScreen />} />
            <Route path="squad" element={<SquadScreen />} />
            <Route path="team/:team" element={<SquadScreen />} />
            <Route path="player/:player" element={<PlayerScreen />} />
            <Route path="players" element={<PlayersScreen />} />
            <Route path="staff/:staff" element={<StaffScreen />} />
            <Route path="match" element={<MatchScreen />} />
            <Route path="matches/:match" element={<MatchDetailScreen />} />
            <Route path="schedule" element={<ScheduleScreen />} />
            <Route path="competitions" element={<CompetitionsScreen />} />
            <Route path="competitions/:comp" element={<CompetitionScreen />} />
            <Route path="meta" element={<MetaScreen />} />
            <Route path="inbox" element={<InboxScreen />} />
            <Route path="training" element={<TrainingScreen />} />
            <Route path="club" element={<ClubScreen />} />
            <Route path="transfers" element={<TransfersScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CatalogProvider>
  );
}
