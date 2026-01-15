import { useEffect } from "react";
import { apiConfig } from "@/config/api";

type Props = {
  onCredentialsSet: (creds: {
    freshserviceApiKey: string;
    freshserviceDomain: string;
    zenviaApiToken: string;
  }) => void;
};

export default function CredentialsConfig({ onCredentialsSet }: Props) {
  useEffect(() => {
    onCredentialsSet({
      freshserviceDomain: apiConfig.freshservice.domain,
      freshserviceApiKey: apiConfig.freshservice.apiKey,
      zenviaApiToken: apiConfig.zenvia.apiToken,
    });
  }, [onCredentialsSet]);

  return null;
}
