import { Module, forwardRef } from "@nestjs/common";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
