import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SocialLoginModule, SocialAuthServiceConfig } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { JwtModule } from '@auth0/angular-jwt';

import { AppComponent } from './app.component';
import { LoadingComponent } from './features/public/loading/loading.component';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { EditProfileComponent } from './features/admin/edit-profile/edit-profile.component';
import { SendInstallerInvitationComponent } from './features/admin/send-installer-invitation/send-installer-invitation.component';
import { InstallerRegisterComponent } from './features/installer/installer-register/installer-register.component';
import { InstallerHomeComponent } from './features/installer/installer-home/installer-home.component';
import { AddBassinComponent } from './features/admin/bassin/add-bassin/add-bassin.component';
import { UpdateBassinComponent } from './features/admin/bassin/update-bassin/update-bassin.component';
import { DetailsBassinComponent } from './features/admin/bassin/details-bassin/details-bassin.component';
import { ListCategoriesComponent } from './features/admin/Categorie/list-categories/list-categories.component';
import { AddCategorieComponent } from './features/admin/Categorie/add-categorie/add-categorie.component';
import { UpdateCategorieComponent } from './features/admin/Categorie/update-categorie/update-categorie.component';
import { HomePageComponent } from './features/public/home-page/home-page.component';
import { ShopPageComponent } from './features/public/shop-page/shop-page.component';
import { BassinComponent } from './features/admin/bassin/bassin/bassin.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { LayoutComponent } from './features/admin/layout/layout.component';
import { UsersListComponent } from './features/admin/users-list/users-list.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './features/public/login/login.component';
import { RegisterComponent } from './features/public/register/register.component';
import { VerifEmailComponent } from './features/public/verif-email/verif-email.component';
import { ResetPasswordComponent } from './features/public/reset-password/reset-password.component';
import { RequestResetPasswordComponent } from './features/public/request-reset-password/request-reset-password.component';
import { ValidateCodeComponent } from './features/public/validate-code/validate-code.component';
import { GithubToCdnPipe } from './pipes/github-to-cdn.pipe';
import { ArViewerComponent } from './features/admin/bassin/realite-augmenter/ar-viewer/ar-viewer.component';
import { BassinDetailComponent } from './features/public/bassin-detail/bassin-detail.component';
import { BassinPersonnaliseComponent } from './features/admin/bassin/bassin-personnalise/bassin-personnalise.component';
import { BassinPersonnaliseDetailsComponent } from './features/admin/bassin/bassin-personnalise-details/bassin-personnalise-details.component';
import { BassinPersonnaliseUpdateComponent } from './features/admin/bassin/bassin-personnalise-update/bassin-personnalise-update.component';
import { BassinPersonnaliseClientComponent } from './features/admin/bassin/bassin-personnalise-client/bassin-personnalise-client.component';
import { BassinPersonnaliseArdetailComponent } from './features/admin/bassin/bassin-personnalise-ardetail/bassin-personnalise-ardetail.component';
import { CommonModule, DatePipe } from '@angular/common';
import { EditPromotionComponent } from './features/admin/promotion/edit-promotion/edit-promotion.component';
import { PromotionsListComponent } from './features/admin/promotion/promotions-list/promotions-list.component';
import { NotificationsComponent } from './features/admin/notifications/notifications.component';
import { StocksListComponent } from './features/admin/stocks/stocks-list/stocks-list.component';
import { StockActionDialogComponent } from './features/admin/stocks/stock-action-dialog/stock-action-dialog.component';
import { ToastComponent } from './toast/toast.component';
import { HeaderComponent } from './features/public/header/header.component';
import { FooterComponent } from './features/public/footer/footer.component';
import { CartComponent } from './features/public/cart/cart.component';
import { FavoritesPageComponent } from './features/public/favorites-page/favorites-page.component';
import { AvisComponent } from './features/admin/avis/avis.component';
import { AddPromotionComponent } from './features/admin/promotion/add-promotion/add-promotion.component';
import { UpdateProfileComponent } from './features/client/update-profile/update-profile.component';
import { UpdateProfilComponent } from './features/installer/update-profil/update-profil.component';
import { BassinImagePipe } from './pipes/bassin-image.pipe';
import { AuthService } from './core/authentication/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruncatePipe } from './pipes/truncate.pipe';

export function tokenGetter() {
  return localStorage.getItem('jwt');
}

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    EditProfileComponent,
    HomePageComponent,

    LoginComponent,
    RegisterComponent,
    VerifEmailComponent,
    ForbiddenComponent,
    SendInstallerInvitationComponent,
    InstallerRegisterComponent,
    InstallerHomeComponent,
    ResetPasswordComponent,
    RequestResetPasswordComponent,
    ValidateCodeComponent,
    BassinComponent,
    AddBassinComponent,
    UpdateBassinComponent,
    DetailsBassinComponent,
    ListCategoriesComponent,
    AddCategorieComponent,
    UpdateCategorieComponent,
    ShopPageComponent,
    LoadingComponent,
    LayoutComponent,
    UsersListComponent,
    GithubToCdnPipe,
    ArViewerComponent,
    BassinDetailComponent,
    BassinPersonnaliseComponent,
    BassinPersonnaliseDetailsComponent,
    BassinPersonnaliseUpdateComponent,
    BassinPersonnaliseClientComponent,
    BassinPersonnaliseArdetailComponent,
    PromotionsListComponent,
    AddPromotionComponent,
    EditPromotionComponent,
    NotificationsComponent,
    StocksListComponent,
    StockActionDialogComponent,
    ToastComponent,
    HeaderComponent,
    FooterComponent,
    CartComponent,
    FavoritesPageComponent,
    AvisComponent,
    UpdateProfileComponent,
    UpdateProfilComponent,
    TruncatePipe,
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'my-angular-app' }),
    AppRoutingModule,
    HttpClientModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule, 
    MatTableModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    SocialLoginModule,
    BassinImagePipe,

    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['localhost:8002', 'localhost:8004'],
        disallowedRoutes: []
      },
    }),
  ],
  providers: [
    AuthService,
    [DatePipe],
    { provide: HTTP_INTERCEPTORS,
       useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, 
      useClass: AuthInterceptor, 
      multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider('133465243893-f4gk1sbs2adeoc4i2sapighi25pai6qt.apps.googleusercontent.com')
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig
    },
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
    provideClientHydration(),
    
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}