import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './auth.guard';

import { ForbiddenComponent } from './forbidden/forbidden.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { EditProfileComponent } from './features/admin/edit-profile/edit-profile.component';
import { InstallerHomeComponent } from './features/installer/installer-home/installer-home.component';
import { InstallerRegisterComponent } from './features/installer/installer-register/installer-register.component';
import { SendInstallerInvitationComponent } from './features/admin/send-installer-invitation/send-installer-invitation.component';
import { BassinComponent } from './features/admin/bassin/bassin/bassin.component';
import { AddBassinComponent } from './features/admin/bassin/add-bassin/add-bassin.component';
import { UpdateBassinComponent } from './features/admin/bassin/update-bassin/update-bassin.component';
import { DetailsBassinComponent } from './features/admin/bassin/details-bassin/details-bassin.component';
import { ListCategoriesComponent } from './features/admin/Categorie/list-categories/list-categories.component';
import { AddCategorieComponent } from './features/admin/Categorie/add-categorie/add-categorie.component';
import { UpdateCategorieComponent } from './features/admin/Categorie/update-categorie/update-categorie.component';
import { HomePageComponent } from './features/public/home-page/home-page.component';
//import { ShopPageComponent } from './features/public/shop-page/shop-page.component';
import { LoadingComponent } from './features/public/loading/loading.component';
import { LayoutComponent } from './features/admin/layout/layout.component';
import { UsersListComponent } from './features/admin/users-list/users-list.component';
import { LoginComponent } from './features/public/login/login.component';
import { RegisterComponent } from './features/public/register/register.component';
import { VerifEmailComponent } from './features/public/verif-email/verif-email.component';
import { ResetPasswordComponent } from './features/public/reset-password/reset-password.component';
import { RequestResetPasswordComponent } from './features/public/request-reset-password/request-reset-password.component';
import { ValidateCodeComponent } from './features/public/validate-code/validate-code.component';
import { BassinPersonnaliseComponent } from './features/admin/bassin/bassin-personnalise/bassin-personnalise.component';
import { BassinPersonnaliseDetailsComponent } from './features/admin/bassin/bassin-personnalise-details/bassin-personnalise-details.component';
import { BassinPersonnaliseUpdateComponent } from './features/admin/bassin/bassin-personnalise-update/bassin-personnalise-update.component';
import { BassinPersonnaliseClientComponent } from './features/admin/bassin/bassin-personnalise-client/bassin-personnalise-client.component';
import { BassinPersonnaliseArdetailComponent } from './features/admin/bassin/bassin-personnalise-ardetail/bassin-personnalise-ardetail.component';
import { AvisComponent } from './features/admin/avis/avis.component';
import { PromotionsListComponent } from './features/admin/promotion/promotions-list/promotions-list.component';
import { AddPromotionComponent } from './features/admin/promotion/add-promotion/add-promotion.component';
import { EditPromotionComponent } from './features/admin/promotion/edit-promotion/edit-promotion.component';
import { StocksListComponent } from './features/admin/stocks/stocks-list/stocks-list.component';
import { UpdateProfilComponent } from './features/installer/update-profil/update-profil.component';
import { UpdateProfileComponent } from './features/client/update-profile/update-profile.component';
import { CartComponent } from './features/public/cart/cart.component';
import { ShopPageComponent } from './features/public/shop-page/shop-page.component';
import { BassinDetailComponent } from './features/public/bassin-detail/bassin-detail.component';

const routes: Routes = [
  // Admin Routes (Only accessible by users with the 'ADMIN' role)
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  {
    path: 'loading',
    component: LoadingComponent,
  },
  {
    path: 'admin/edit-profile',
    component: EditProfileComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/List-users',
    component: UsersListComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/send-installer-invitation',
    component: SendInstallerInvitationComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  //Gestion des Catégories
  {
    path: 'admin/list-categories',
    component: ListCategoriesComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/add-categorie',
    component: AddCategorieComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/update-categorie/:id',
    component: UpdateCategorieComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  //Gestion des Bassins
  {
    path: 'admin/bassin',
    component: BassinComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/addBassin',
    component: AddBassinComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  {
    path: 'admin/updatebassin/:id',
    component: UpdateBassinComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  {
    path: 'admin/details-bassin/:id',
    component: DetailsBassinComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  // PERSONNALISATION BASSIN
  {
    path: 'admin/personnalise-bassin/:id',
    component: BassinPersonnaliseComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  {
    path: 'admin/detail-bassin-personnalise/:id',
    component: BassinPersonnaliseDetailsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  {
    path: 'admin/update-bassin-personnalise/:id',
    component: BassinPersonnaliseUpdateComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  //GESTION DES AVIS
  {
    path: 'admin/avis',
    component: AvisComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] },
  },

  //GESTION DES PROMOTIONS
  {
    path: 'admin/promotions',
    component: PromotionsListComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/promotions/add',
    component: AddPromotionComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/promotions/edit/:id',
    component: EditPromotionComponent,
    data: { roles: ['ADMIN'] },
  },

  //GESTION DE STOCK
  {
    path: 'admin/stocks',
    component: StocksListComponent,
  },

  ////////////à voir quelle role
  {
    path: 'client/edit-profile',
    component: UpdateProfileComponent,
    canActivate: [AuthGuard],
    data: { roles: ['CLIENT'] },
  },

  // INSTALLATEUR Routes (Only accessible by users with the 'ADMIN' role)
  {
    path: 'inst/edit-profile',
    component: UpdateProfilComponent,
    canActivate: [AuthGuard],
    data: { roles: ['INSTALLATEUR'] },
  },

  {
    path: 'client/edit-profile',
    component: UpdateProfileComponent,
    canActivate: [AuthGuard],
    data: { roles: ['CLIENT'] },
  },


  /**********************
   *
   * les pages
   * accessibles
   * sans authentification
   *
   */

  { path: 'homepage', component: HomePageComponent },
  { path: 'shop', component: ShopPageComponent },

  { path: 'bassin-details/:id', component: BassinDetailComponent },

  { path: 'admin/client-bassin-personnalise/:id', component: BassinPersonnaliseClientComponent },
  { path: 'admin/ardetail-bassin-personnalise/:id', component: BassinPersonnaliseArdetailComponent },
  { path: 'cart', component: CartComponent },


  // Installer Routes (Only accessible by authenticated users with the 'INSTALLATEUR' role)
  {
    path: 'installer-home',
    component: InstallerHomeComponent,
    canActivate: [AuthGuard],
    data: { roles: ['INSTALLATEUR'] },
  },
  {
    path: 'installer-register',
    component: InstallerRegisterComponent,
  },

  // Authentication Routes (Public routes)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verifEmail', component: VerifEmailComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'request-reset-password', component: RequestResetPasswordComponent },
  { path: 'validate-code', component: ValidateCodeComponent },
  { path: 'layout', component: LayoutComponent },


  // Forbidden Route (For unauthorized access)
  { path: 'forbidden', component: ForbiddenComponent },

  // Default and Fallback Routes
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // Redirect to login by default
  { path: '**', redirectTo: '/login' }, // Redirect to login for unknown routes
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
