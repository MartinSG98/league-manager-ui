import { Button, Center, Code, Stack, Text, Title } from "@mantine/core";

export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Center mih="100vh" px="md">
      <Stack align="center" gap="sm" maw={560} ta="center">
        <Text className="eyebrow">Connection</Text>
        <Title className="display" fz={40}>
          The server is not answering
        </Title>
        <Text c="dimmed">
          Start the backend with <Code>uvicorn app.main:app --port 8020</Code> in league-manager-backend, then try again.
        </Text>
        <Button mt="md" onClick={onRetry}>
          Try again
        </Button>
      </Stack>
    </Center>
  );
}
