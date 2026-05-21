import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CampaignController } from "./campaign.controller";
import { CampaignService } from "./campaign.service";
import { CampaignProcessor } from "./campaign.processor";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({
      name: "campaign",
    }),
  ],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignProcessor],
  exports: [CampaignService],
})
export class CampaignModule {}
