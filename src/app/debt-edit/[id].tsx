import DebtForm from "@/components/DebtForm";
import { useLocalSearchParams } from "expo-router";

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DebtForm id={id} />;
}
