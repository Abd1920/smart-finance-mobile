import TransactionForm from "@/components/TransactionForm";
import { useLocalSearchParams } from "expo-router";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionForm id={id} />;
}
