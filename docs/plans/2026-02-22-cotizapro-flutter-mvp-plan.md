# CotizaPro Mobile — Flutter MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Flutter mobile app (Android + iOS) for field technicians to create and send quotes using the existing CotizaPro REST API.

**Architecture:** BLoC + Repository Pattern. Each feature has its own data/domain/presentation layers. Dio handles HTTP with a JWT interceptor. Hive caches the service catalog and clients for offline use. Supabase Flutter SDK handles auth only.

**Tech Stack:** Flutter 3.x, flutter_bloc ^8, dio ^5, hive_flutter ^1, supabase_flutter ^2, go_router ^14, flutter_dotenv, url_launcher, flutter_pdfview, mocktail

---

## Prerequisites

- Flutter SDK installed (`flutter --version` should show 3.x)
- Android Studio or Xcode (for iOS) configured
- The CotizaPro web app running locally on `http://localhost:3000` (or deployed URL)
- Supabase project credentials (same as web app)
- GitHub account for new repo

---

## Task 1: Initialize Flutter Project

**Files:**
- Create: `cotizapro-mobile/` (new directory, sibling to `my-saas-app/`)
- Create: `cotizapro-mobile/pubspec.yaml`
- Create: `cotizapro-mobile/.env.development`
- Create: `cotizapro-mobile/.env.production`
- Create: `cotizapro-mobile/.gitignore`

**Step 1: Create Flutter project**

```bash
cd ~/Desktop/claude
flutter create cotizapro_mobile --org mx.cotizapro --platforms android,ios
mv cotizapro_mobile cotizapro-mobile
cd cotizapro-mobile
```

Expected: Flutter project created with `lib/main.dart`, `android/`, `ios/`

**Step 2: Initialize git**

```bash
git init
git branch -M main
```

**Step 3: Replace pubspec.yaml**

```yaml
name: cotizapro_mobile
description: CotizaPro Mobile — Quote management for field technicians
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_bloc: ^8.1.6
  dio: ^5.4.3+1
  hive_flutter: ^1.1.0
  supabase_flutter: ^2.5.6
  go_router: ^14.2.7
  flutter_dotenv: ^5.1.0
  url_launcher: ^6.3.0
  flutter_pdfview: ^1.3.2
  intl: ^0.19.0
  equatable: ^2.0.5
  get_it: ^7.7.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
  mocktail: ^1.0.4
  flutter_lints: ^4.0.0
  hive_generator: ^2.0.1
  build_runner: ^2.4.9
  lcov: ^0.1.2

flutter:
  uses-material-design: true
  assets:
    - .env.development
    - .env.production
```

**Step 4: Create environment files**

`.env.development`:
```
API_BASE_URL=http://localhost:3000
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7W9oHJAcb5ToL_6XG7RvtZVKi-UWMQ9MMIE
```

`.env.production`:
```
API_BASE_URL=https://your-production-url.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
```

**Step 5: Create .gitignore**

```
.env.production
.dart_tool/
build/
*.g.dart
.flutter-plugins
.flutter-plugins-dependencies
pubspec.lock
```

Note: `.env.development` IS committed (no secrets, local only). `.env.production` is NOT committed.

**Step 6: Install dependencies**

```bash
flutter pub get
```

Expected: `pubspec.lock` created, all packages resolved

**Step 7: Verify project runs**

```bash
flutter analyze
```

Expected: No issues

**Step 8: Commit**

```bash
git add .
git commit -m "feat: initialize Flutter project with dependencies"
```

---

## Task 2: Core — Directory Structure

**Files:**
- Create: `lib/core/auth/` directory
- Create: `lib/core/http/` directory
- Create: `lib/core/cache/` directory
- Create: `lib/core/router/` directory
- Create: `lib/core/theme/` directory
- Create: `lib/features/dashboard/`
- Create: `lib/features/clients/`
- Create: `lib/features/services/`
- Create: `lib/features/quotes/`
- Create: `lib/features/profile/`

**Step 1: Create all directories with placeholder files**

```bash
mkdir -p lib/core/{auth,http,cache,router,theme}
mkdir -p lib/features/{dashboard,clients,services,quotes,profile}
mkdir -p lib/features/clients/{data,domain,presentation/{bloc,pages,widgets}}
mkdir -p lib/features/services/{data,domain,presentation/{bloc,pages,widgets}}
mkdir -p lib/features/quotes/{data,domain,presentation/{bloc,pages,widgets}}
mkdir -p lib/features/dashboard/presentation/{pages,widgets}
mkdir -p lib/features/profile/presentation/pages
mkdir -p test/{unit/{clients,services,quotes},widget}
mkdir -p integration_test
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: create project directory structure"
```

---

## Task 3: Core — Theme

**Files:**
- Create: `lib/core/theme/app_theme.dart`
- Create: `lib/core/theme/app_colors.dart`

**Step 1: Create colors**

`lib/core/theme/app_colors.dart`:
```dart
import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF1E40AF);      // Blue 800
  static const Color primaryLight = Color(0xFF3B82F6); // Blue 500
  static const Color surface = Color(0xFFF8FAFC);
  static const Color error = Color(0xFFDC2626);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);
  static const Color white = Color(0xFFFFFFFF);
}
```

**Step 2: Create theme**

`lib/core/theme/app_theme.dart`:
```dart
import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: AppColors.surface,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.white,
            minimumSize: const Size(double.infinity, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        cardTheme: CardTheme(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.border),
          ),
          color: AppColors.white,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      );
}
```

**Step 3: Commit**

```bash
git add lib/core/theme/
git commit -m "feat: add app theme and colors"
```

---

## Task 4: Core — HTTP Client (Dio)

**Files:**
- Create: `lib/core/http/api_client.dart`
- Create: `lib/core/http/auth_interceptor.dart`
- Test: `test/unit/api_client_test.dart`

**Step 1: Write the failing test**

`test/unit/api_client_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:cotizapro_mobile/core/http/api_client.dart';

void main() {
  group('ApiClient', () {
    test('creates with base URL', () {
      final client = ApiClient(baseUrl: 'http://localhost:3000');
      expect(client, isNotNull);
    });

    test('has /api prefix on all requests', () {
      final client = ApiClient(baseUrl: 'http://localhost:3000');
      expect(client.dio.options.baseUrl, equals('http://localhost:3000/api'));
    });
  });
}
```

**Step 2: Run to verify failure**

```bash
flutter test test/unit/api_client_test.dart
```

Expected: FAIL — `ApiClient` not found

**Step 3: Create auth interceptor**

`lib/core/http/auth_interceptor.dart`:
```dart
import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      options.headers['Authorization'] = 'Bearer ${session.accessToken}';
    }
    super.onRequest(options, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Token expired — Supabase SDK auto-refreshes, but if still 401, force logout
      Supabase.instance.client.auth.signOut();
    }
    super.onError(err, handler);
  }
}
```

**Step 4: Create API client**

`lib/core/http/api_client.dart`:
```dart
import 'package:dio/dio.dart';
import 'auth_interceptor.dart';

class ApiClient {
  final Dio dio;

  ApiClient({required String baseUrl})
      : dio = Dio(
          BaseOptions(
            baseUrl: '$baseUrl/api',
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(AuthInterceptor());
  }
}
```

**Step 5: Run test to verify pass**

```bash
flutter test test/unit/api_client_test.dart
```

Expected: PASS

**Step 6: Commit**

```bash
git add lib/core/http/ test/unit/api_client_test.dart
git commit -m "feat: add Dio API client with auth interceptor"
```

---

## Task 5: Core — Hive Cache Setup

**Files:**
- Create: `lib/core/cache/hive_cache.dart`

**Step 1: Create cache initializer**

`lib/core/cache/hive_cache.dart`:
```dart
import 'package:hive_flutter/hive_flutter.dart';

class HiveCache {
  static Future<void> initialize() async {
    await Hive.initFlutter();
    // Boxes are opened lazily per feature
  }

  static Future<Box<T>> openBox<T>(String name) async {
    if (Hive.isBoxOpen(name)) {
      return Hive.box<T>(name);
    }
    return await Hive.openBox<T>(name);
  }

  static Future<void> clearAll() async {
    final boxes = ['services_cache', 'clients_cache'];
    for (final name in boxes) {
      if (Hive.isBoxOpen(name)) {
        await Hive.box(name).clear();
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add lib/core/cache/
git commit -m "feat: add Hive cache initializer"
```

---

## Task 6: Core — Service Locator (get_it)

**Files:**
- Create: `lib/core/di/service_locator.dart`

**Step 1: Create service locator**

`lib/core/di/service_locator.dart`:
```dart
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get_it/get_it.dart';
import '../http/api_client.dart';

final GetIt sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';

  // Core
  sl.registerLazySingleton<ApiClient>(() => ApiClient(baseUrl: baseUrl));
}
```

**Step 2: Commit**

```bash
mkdir -p lib/core/di
git add lib/core/di/
git commit -m "feat: add get_it service locator"
```

---

## Task 7: Core — main.dart

**Files:**
- Modify: `lib/main.dart`

**Step 1: Replace main.dart**

`lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/cache/hive_cache.dart';
import 'core/di/service_locator.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const env = String.fromEnvironment('ENV', defaultValue: 'development');
  await dotenv.load(fileName: '.env.$env');

  await HiveCache.initialize();

  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  await setupServiceLocator();

  runApp(const CotizaProApp());
}

class CotizaProApp extends StatelessWidget {
  const CotizaProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'CotizaPro',
      theme: AppTheme.light,
      routerConfig: AppRouter.router,
      debugShowCheckedModeBanner: false,
    );
  }
}
```

**Step 2: Verify app compiles (router not created yet, will add stub)**

Create stub router first: `lib/core/router/app_router.dart`:
```dart
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const Scaffold(body: Center(child: Text('Login'))),
      ),
    ],
  );
}
```

**Step 3: Run flutter analyze**

```bash
flutter analyze
```

Expected: No issues

**Step 4: Commit**

```bash
git add lib/main.dart lib/core/router/
git commit -m "feat: add main.dart with Supabase and Hive initialization"
```

---

## Task 8: Feature Auth — Domain & Repository

**Files:**
- Create: `lib/features/auth/domain/auth_repository.dart`
- Create: `lib/features/auth/data/auth_repository_impl.dart`
- Test: `test/unit/auth/auth_repository_test.dart`

**Step 1: Create directory**

```bash
mkdir -p lib/features/auth/{domain,data,presentation/{bloc,pages}}
mkdir -p test/unit/auth
```

**Step 2: Write failing test**

`test/unit/auth/auth_repository_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:cotizapro_mobile/features/auth/data/auth_repository_impl.dart';

class MockSupabaseClient extends Mock implements SupabaseClient {}
class MockGoTrueClient extends Mock implements GoTrueClient {}

void main() {
  late MockSupabaseClient mockClient;
  late MockGoTrueClient mockAuth;
  late AuthRepositoryImpl repo;

  setUp(() {
    mockClient = MockSupabaseClient();
    mockAuth = MockGoTrueClient();
    when(() => mockClient.auth).thenReturn(mockAuth);
    repo = AuthRepositoryImpl(client: mockClient);
  });

  test('signIn calls supabase signInWithPassword', () async {
    when(() => mockAuth.signInWithPassword(
      email: any(named: 'email'),
      password: any(named: 'password'),
    )).thenAnswer((_) async => AuthResponse());

    await repo.signIn(email: 'test@test.com', password: 'pass');

    verify(() => mockAuth.signInWithPassword(
      email: 'test@test.com',
      password: 'pass',
    )).called(1);
  });

  test('signOut calls supabase signOut', () async {
    when(() => mockAuth.signOut()).thenAnswer((_) async {});

    await repo.signOut();

    verify(() => mockAuth.signOut()).called(1);
  });
}
```

**Step 3: Run to verify failure**

```bash
flutter test test/unit/auth/auth_repository_test.dart
```

Expected: FAIL — `AuthRepositoryImpl` not found

**Step 4: Create abstract repository**

`lib/features/auth/domain/auth_repository.dart`:
```dart
abstract class AuthRepository {
  Future<void> signIn({required String email, required String password});
  Future<void> signOut();
  bool get isAuthenticated;
  String? get currentUserId;
  String? get currentUserEmail;
}
```

**Step 5: Create implementation**

`lib/features/auth/data/auth_repository_impl.dart`:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../domain/auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  final SupabaseClient _client;

  AuthRepositoryImpl({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  @override
  Future<void> signIn({required String email, required String password}) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  @override
  bool get isAuthenticated => _client.auth.currentSession != null;

  @override
  String? get currentUserId => _client.auth.currentUser?.id;

  @override
  String? get currentUserEmail => _client.auth.currentUser?.email;
}
```

**Step 6: Run test to verify pass**

```bash
flutter test test/unit/auth/auth_repository_test.dart
```

Expected: PASS

**Step 7: Commit**

```bash
git add lib/features/auth/domain/ lib/features/auth/data/ test/unit/auth/
git commit -m "feat: add auth repository with Supabase implementation"
```

---

## Task 9: Feature Auth — BLoC

**Files:**
- Create: `lib/features/auth/presentation/bloc/auth_bloc.dart`
- Create: `lib/features/auth/presentation/bloc/auth_event.dart`
- Create: `lib/features/auth/presentation/bloc/auth_state.dart`
- Test: `test/unit/auth/auth_bloc_test.dart`

**Step 1: Create events**

`lib/features/auth/presentation/bloc/auth_event.dart`:
```dart
abstract class AuthEvent {}

class AuthSignInRequested extends AuthEvent {
  final String email;
  final String password;
  AuthSignInRequested({required this.email, required this.password});
}

class AuthSignOutRequested extends AuthEvent {}
```

**Step 2: Create states**

`lib/features/auth/presentation/bloc/auth_state.dart`:
```dart
import 'package:equatable/equatable.dart';

abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {}
class AuthUnauthenticated extends AuthState {}

class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
  @override
  List<Object?> get props => [message];
}
```

**Step 3: Write failing test**

`test/unit/auth/auth_bloc_test.dart`:
```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cotizapro_mobile/features/auth/domain/auth_repository.dart';
import 'package:cotizapro_mobile/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:cotizapro_mobile/features/auth/presentation/bloc/auth_event.dart';
import 'package:cotizapro_mobile/features/auth/presentation/bloc/auth_state.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository mockRepo;
  late AuthBloc bloc;

  setUp(() {
    mockRepo = MockAuthRepository();
    bloc = AuthBloc(repository: mockRepo);
  });

  tearDown(() => bloc.close());

  blocTest<AuthBloc, AuthState>(
    'emits [Loading, Authenticated] on successful sign in',
    build: () {
      when(() => mockRepo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenAnswer((_) async {});
      return bloc;
    },
    act: (b) => b.add(AuthSignInRequested(email: 'a@b.com', password: 'pass')),
    expect: () => [AuthLoading(), AuthAuthenticated()],
  );

  blocTest<AuthBloc, AuthState>(
    'emits [Loading, Error] on sign in failure',
    build: () {
      when(() => mockRepo.signIn(email: any(named: 'email'), password: any(named: 'password')))
          .thenThrow(Exception('Invalid credentials'));
      return bloc;
    },
    act: (b) => b.add(AuthSignInRequested(email: 'a@b.com', password: 'wrong')),
    expect: () => [AuthLoading(), isA<AuthError>()],
  );
}
```

Add `bloc_test` to pubspec.yaml dev_dependencies:
```yaml
dev_dependencies:
  bloc_test: ^9.1.7
```

Run `flutter pub get`

**Step 4: Run to verify failure**

```bash
flutter test test/unit/auth/auth_bloc_test.dart
```

Expected: FAIL

**Step 5: Create BLoC**

`lib/features/auth/presentation/bloc/auth_bloc.dart`:
```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/auth_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _repository;

  AuthBloc({required AuthRepository repository})
      : _repository = repository,
        super(AuthInitial()) {
    on<AuthSignInRequested>(_onSignIn);
    on<AuthSignOutRequested>(_onSignOut);
  }

  Future<void> _onSignIn(AuthSignInRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _repository.signIn(email: event.email, password: event.password);
      emit(AuthAuthenticated());
    } catch (e) {
      emit(AuthError('Credenciales incorrectas. Verifica tu email y contraseña.'));
    }
  }

  Future<void> _onSignOut(AuthSignOutRequested event, Emitter<AuthState> emit) async {
    await _repository.signOut();
    emit(AuthUnauthenticated());
  }
}
```

**Step 6: Run test to verify pass**

```bash
flutter test test/unit/auth/auth_bloc_test.dart
```

Expected: PASS

**Step 7: Commit**

```bash
git add lib/features/auth/presentation/bloc/ test/unit/auth/auth_bloc_test.dart pubspec.yaml pubspec.lock
git commit -m "feat: add auth BLoC with sign in/out"
```

---

## Task 10: Feature Auth — Login Screen

**Files:**
- Create: `lib/features/auth/presentation/pages/login_page.dart`
- Test: `test/widget/login_page_test.dart`

**Step 1: Create login page**

`lib/features/auth/presentation/pages/login_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(AuthSignInRequested(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          context.go('/dashboard');
        }
        if (state is AuthError) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(state.message), backgroundColor: AppColors.error));
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),
                  const Text('CotizaPro', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Inicia sesion para continuar',
                      style: TextStyle(color: AppColors.textSecondary)),
                  const SizedBox(height: 40),
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Correo electronico'),
                    validator: (v) => (v?.contains('@') ?? false) ? null : 'Correo invalido',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordCtrl,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Contrasena',
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Minimo 6 caracteres',
                  ),
                  const SizedBox(height: 32),
                  BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, state) {
                      if (state is AuthLoading) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      return ElevatedButton(
                        onPressed: _submit,
                        child: const Text('Iniciar sesion'),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add lib/features/auth/
git commit -m "feat: add login screen"
```

---

## Task 11: Core — Router (go_router with auth guard)

**Files:**
- Modify: `lib/core/router/app_router.dart`
- Modify: `lib/core/di/service_locator.dart`

**Step 1: Update router with all routes and auth guard**

`lib/core/router/app_router.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/clients/presentation/pages/clients_list_page.dart';
import '../../features/clients/presentation/pages/client_create_page.dart';
import '../../features/services/presentation/pages/services_page.dart';
import '../../features/quotes/presentation/pages/quotes_list_page.dart';
import '../../features/quotes/presentation/pages/quote_create_page.dart';
import '../../features/quotes/presentation/pages/quote_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../shell/main_shell.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuthenticated = Supabase.instance.client.auth.currentSession != null;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isAuthenticated && !isLoginRoute) return '/login';
      if (isAuthenticated && isLoginRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardPage()),
          GoRoute(path: '/clients', builder: (_, __) => const ClientsListPage()),
          GoRoute(path: '/clients/new', builder: (_, __) => const ClientCreatePage()),
          GoRoute(path: '/services', builder: (_, __) => const ServicesPage()),
          GoRoute(path: '/quotes', builder: (_, __) => const QuotesListPage()),
          GoRoute(path: '/quotes/new', builder: (_, __) => const QuoteCreatePage()),
          GoRoute(
            path: '/quotes/:id',
            builder: (_, state) => QuoteDetailPage(id: state.pathParameters['id']!),
          ),
          GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
        ],
      ),
    ],
  );
}
```

**Step 2: Create MainShell (bottom nav)**

```bash
mkdir -p lib/core/shell
```

`lib/core/shell/main_shell.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  static const _tabs = [
    ('/dashboard', Icons.home_outlined, Icons.home, 'Inicio'),
    ('/clients', Icons.people_outline, Icons.people, 'Clientes'),
    ('/services', Icons.build_outlined, Icons.build, 'Servicios'),
    ('/quotes', Icons.description_outlined, Icons.description, 'Cotizaciones'),
    ('/profile', Icons.person_outline, Icons.person, 'Perfil'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].$1)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) => context.go(_tabs[i].$1),
        destinations: _tabs
            .map((t) => NavigationDestination(
                  icon: Icon(t.$2),
                  selectedIcon: Icon(t.$3),
                  label: t.$4,
                ))
            .toList(),
      ),
    );
  }
}
```

**Step 3: Create stub pages for all routes (so router compiles)**

```bash
mkdir -p lib/features/dashboard/presentation/pages
mkdir -p lib/features/profile/presentation/pages
```

Create stubs for each page (replace with real implementations in later tasks):

`lib/features/dashboard/presentation/pages/dashboard_page.dart`:
```dart
import 'package:flutter/material.dart';
class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: Text('Dashboard')));
}
```

Repeat similar stubs for: `clients_list_page.dart`, `client_create_page.dart`, `services_page.dart`, `quotes_list_page.dart`, `quote_create_page.dart`, `quote_detail_page.dart` (with `id` param), `profile_page.dart`.

**Step 4: Run flutter analyze**

```bash
flutter analyze
```

Expected: No issues

**Step 5: Commit**

```bash
git add lib/core/router/ lib/core/shell/ lib/features/
git commit -m "feat: add go_router with auth guard and bottom navigation"
```

---

## Task 12: Feature Services — Domain & Repository

**Files:**
- Create: `lib/features/services/domain/models/service.dart`
- Create: `lib/features/services/domain/services_repository.dart`
- Create: `lib/features/services/data/services_repository_impl.dart`
- Test: `test/unit/services/services_repository_test.dart`

**Step 1: Create Service model**

`lib/features/services/domain/models/service.dart`:
```dart
import 'package:equatable/equatable.dart';

class Service extends Equatable {
  final String id;
  final String name;
  final double unitPrice;
  final String unitType;   // fixed|per_hour|per_sqm|per_unit
  final String category;  // hvac|painting|plumbing|electrical|other
  final String? description;

  const Service({
    required this.id,
    required this.name,
    required this.unitPrice,
    required this.unitType,
    required this.category,
    this.description,
  });

  factory Service.fromJson(Map<String, dynamic> json) => Service(
        id: json['id'] as String,
        name: json['name'] as String,
        unitPrice: double.parse(json['unit_price'].toString()),  // numeric -> string -> double
        unitType: json['unit_type'] as String,
        category: json['category'] as String,
        description: json['description'] as String?,
      );

  static const unitTypeLabels = {
    'fixed': 'Fijo',
    'per_hour': 'Por Hora',
    'per_sqm': 'Por m\u00B2',
    'per_unit': 'Por Unidad',
  };

  String get unitTypeLabel => unitTypeLabels[unitType] ?? unitType;

  @override
  List<Object?> get props => [id, name, unitPrice, unitType, category];
}
```

**Step 2: Write failing test**

`test/unit/services/services_repository_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:cotizapro_mobile/core/http/api_client.dart';
import 'package:cotizapro_mobile/features/services/data/services_repository_impl.dart';
import 'package:cotizapro_mobile/features/services/domain/models/service.dart';

class MockApiClient extends Mock implements ApiClient {}
class MockDio extends Mock implements Dio {}

void main() {
  late MockApiClient mockApiClient;
  late MockDio mockDio;
  late ServicesRepositoryImpl repo;

  setUp(() {
    mockApiClient = MockApiClient();
    mockDio = MockDio();
    when(() => mockApiClient.dio).thenReturn(mockDio);
    repo = ServicesRepositoryImpl(apiClient: mockApiClient);
  });

  test('getServices parses response and casts unit_price to double', () async {
    when(() => mockDio.get('/services')).thenAnswer((_) async => Response(
          data: {
            'data': [
              {
                'id': 'uuid-1',
                'name': 'Instalacion AC',
                'unit_price': '1500.00',   // API returns string
                'unit_type': 'fixed',
                'category': 'hvac',
                'description': null,
              }
            ]
          },
          requestOptions: RequestOptions(path: '/services'),
          statusCode: 200,
        ));

    final services = await repo.getServices();

    expect(services.length, equals(1));
    expect(services.first.unitPrice, equals(1500.0));
    expect(services.first.unitPrice, isA<double>());
  });
}
```

**Step 3: Run to verify failure**

```bash
flutter test test/unit/services/services_repository_test.dart
```

Expected: FAIL

**Step 4: Create abstract repository**

`lib/features/services/domain/services_repository.dart`:
```dart
import 'models/service.dart';

abstract class ServicesRepository {
  Future<List<Service>> getServices();
  Future<void> cacheServices(List<Service> services);
  Future<List<Service>> getCachedServices();
}
```

**Step 5: Create implementation**

`lib/features/services/data/services_repository_impl.dart`:
```dart
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/http/api_client.dart';
import '../domain/models/service.dart';
import '../domain/services_repository.dart';

class ServicesRepositoryImpl implements ServicesRepository {
  final ApiClient _apiClient;
  static const _boxName = 'services_cache';

  ServicesRepositoryImpl({required ApiClient apiClient}) : _apiClient = apiClient;

  @override
  Future<List<Service>> getServices() async {
    final response = await _apiClient.dio.get('/services');
    final data = (response.data['data'] as List<dynamic>);
    return data.map((j) => Service.fromJson(j as Map<String, dynamic>)).toList();
  }

  @override
  Future<void> cacheServices(List<Service> services) async {
    final box = await Hive.openBox(_boxName);
    await box.clear();
    for (final s in services) {
      await box.put(s.id, {
        'id': s.id,
        'name': s.name,
        'unit_price': s.unitPrice.toString(),
        'unit_type': s.unitType,
        'category': s.category,
        'description': s.description,
      });
    }
  }

  @override
  Future<List<Service>> getCachedServices() async {
    final box = await Hive.openBox(_boxName);
    return box.values
        .map((v) => Service.fromJson(Map<String, dynamic>.from(v as Map)))
        .toList();
  }
}
```

**Step 6: Run test to verify pass**

```bash
flutter test test/unit/services/services_repository_test.dart
```

Expected: PASS

**Step 7: Commit**

```bash
git add lib/features/services/ test/unit/services/
git commit -m "feat: add services repository with Hive cache"
```

---

## Task 13: Feature Services — BLoC & UI

**Files:**
- Create: `lib/features/services/presentation/bloc/services_bloc.dart`
- Create: `lib/features/services/presentation/bloc/services_event.dart`
- Create: `lib/features/services/presentation/bloc/services_state.dart`
- Modify: `lib/features/services/presentation/pages/services_page.dart`

**Step 1: Create events and states**

`lib/features/services/presentation/bloc/services_event.dart`:
```dart
abstract class ServicesEvent {}
class ServicesLoadRequested extends ServicesEvent {}
```

`lib/features/services/presentation/bloc/services_state.dart`:
```dart
import 'package:equatable/equatable.dart';
import '../../domain/models/service.dart';

abstract class ServicesState extends Equatable {
  @override List<Object?> get props => [];
}
class ServicesInitial extends ServicesState {}
class ServicesLoading extends ServicesState {}
class ServicesLoaded extends ServicesState {
  final List<Service> services;
  final Map<String, List<Service>> byCategory;
  ServicesLoaded(this.services)
      : byCategory = _groupByCategory(services);

  static Map<String, List<Service>> _groupByCategory(List<Service> services) {
    final map = <String, List<Service>>{};
    for (final s in services) {
      map.putIfAbsent(s.category, () => []).add(s);
    }
    return map;
  }
  @override List<Object?> get props => [services];
}
class ServicesError extends ServicesState {
  final String message;
  ServicesError(this.message);
  @override List<Object?> get props => [message];
}
```

**Step 2: Create BLoC**

`lib/features/services/presentation/bloc/services_bloc.dart`:
```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/services_repository.dart';
import 'services_event.dart';
import 'services_state.dart';

class ServicesBloc extends Bloc<ServicesEvent, ServicesState> {
  final ServicesRepository _repository;

  ServicesBloc({required ServicesRepository repository})
      : _repository = repository,
        super(ServicesInitial()) {
    on<ServicesLoadRequested>(_onLoad);
  }

  Future<void> _onLoad(ServicesLoadRequested event, Emitter<ServicesState> emit) async {
    emit(ServicesLoading());
    try {
      final services = await _repository.getServices();
      await _repository.cacheServices(services);
      emit(ServicesLoaded(services));
    } catch (_) {
      try {
        final cached = await _repository.getCachedServices();
        emit(ServicesLoaded(cached));
      } catch (e) {
        emit(ServicesError('No se pudo cargar el catalogo.'));
      }
    }
  }
}
```

**Step 3: Create Services UI page**

`lib/features/services/presentation/pages/services_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/theme/app_colors.dart';
import '../bloc/services_bloc.dart';
import '../bloc/services_event.dart';
import '../bloc/services_state.dart';

class ServicesPage extends StatelessWidget {
  const ServicesPage({super.key});

  static const _categoryLabels = {
    'hvac': 'Clima / HVAC',
    'painting': 'Pintura',
    'plumbing': 'Plomeria',
    'electrical': 'Electrico',
    'other': 'Otros',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Catalogo de Servicios')),
      body: BlocBuilder<ServicesBloc, ServicesState>(
        builder: (context, state) {
          if (state is ServicesLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is ServicesError) {
            return Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(state.message),
                ElevatedButton(
                  onPressed: () => context.read<ServicesBloc>().add(ServicesLoadRequested()),
                  child: const Text('Reintentar'),
                ),
              ]),
            );
          }
          if (state is ServicesLoaded) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: state.byCategory.entries.map((entry) {
                final label = _categoryLabels[entry.key] ?? entry.key;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Text(label,
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                    ),
                    ...entry.value.map((s) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(s.name),
                            subtitle: Text(s.category),
                            trailing: Text(
                              '\$${s.unitPrice.toStringAsFixed(2)} ${s.unitTypeLabel}',
                              style: const TextStyle(
                                  color: AppColors.primary, fontWeight: FontWeight.w600),
                            ),
                          ),
                        )),
                  ],
                );
              }).toList(),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
```

**Step 4: Commit**

```bash
git add lib/features/services/
git commit -m "feat: add services catalog BLoC and UI"
```

---

## Task 14: Feature Clients — Domain, Repository & BLoC

**Files:**
- Create: `lib/features/clients/domain/models/client.dart`
- Create: `lib/features/clients/domain/clients_repository.dart`
- Create: `lib/features/clients/data/clients_repository_impl.dart`
- Create: `lib/features/clients/presentation/bloc/clients_bloc.dart` + event/state
- Test: `test/unit/clients/clients_repository_test.dart`

**Step 1: Create Client model**

`lib/features/clients/domain/models/client.dart`:
```dart
import 'package:equatable/equatable.dart';

class Client extends Equatable {
  final String id;
  final String name;
  final String? companyName;
  final String? email;
  final String? phone;

  const Client({
    required this.id,
    required this.name,
    this.companyName,
    this.email,
    this.phone,
  });

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: json['id'] as String,
        name: json['name'] as String,
        companyName: json['company_name'] as String?,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
      );

  String get displayName => companyName?.isNotEmpty == true ? '$companyName ($name)' : name;

  @override
  List<Object?> get props => [id, name, companyName, email, phone];
}
```

**Step 2: Create abstract repository**

`lib/features/clients/domain/clients_repository.dart`:
```dart
import 'models/client.dart';

abstract class ClientsRepository {
  Future<List<Client>> getClients({String? search});
  Future<Client> createClient({required String name, String? companyName, String? email, String? phone});
  Future<void> cacheClients(List<Client> clients);
  Future<List<Client>> getCachedClients();
}
```

**Step 3: Create implementation**

`lib/features/clients/data/clients_repository_impl.dart`:
```dart
import 'package:hive_flutter/hive_flutter.dart';
import '../../../core/http/api_client.dart';
import '../domain/clients_repository.dart';
import '../domain/models/client.dart';

class ClientsRepositoryImpl implements ClientsRepository {
  final ApiClient _apiClient;
  static const _boxName = 'clients_cache';

  ClientsRepositoryImpl({required ApiClient apiClient}) : _apiClient = apiClient;

  @override
  Future<List<Client>> getClients({String? search}) async {
    final params = <String, dynamic>{'limit': '100'};
    if (search != null && search.isNotEmpty) params['search'] = search;
    final response = await _apiClient.dio.get('/clients', queryParameters: params);
    final data = response.data['clients'] as List<dynamic>;
    return data.map((j) => Client.fromJson(j as Map<String, dynamic>)).toList();
  }

  @override
  Future<Client> createClient({
    required String name,
    String? companyName,
    String? email,
    String? phone,
  }) async {
    final response = await _apiClient.dio.post('/clients', data: {
      'name': name,
      if (companyName != null) 'company_name': companyName,
      if (email != null) 'email': email,
      if (phone != null) 'phone': phone,
    });
    return Client.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> cacheClients(List<Client> clients) async {
    final box = await Hive.openBox(_boxName);
    await box.clear();
    for (final c in clients) {
      await box.put(c.id, {
        'id': c.id, 'name': c.name, 'company_name': c.companyName,
        'email': c.email, 'phone': c.phone,
      });
    }
  }

  @override
  Future<List<Client>> getCachedClients() async {
    final box = await Hive.openBox(_boxName);
    return box.values
        .map((v) => Client.fromJson(Map<String, dynamic>.from(v as Map)))
        .toList();
  }
}
```

**Step 4: Create clients BLoC (events/states/bloc)**

`lib/features/clients/presentation/bloc/clients_event.dart`:
```dart
abstract class ClientsEvent {}
class ClientsLoadRequested extends ClientsEvent {}
class ClientsSearchChanged extends ClientsEvent {
  final String query;
  ClientsSearchChanged(this.query);
}
```

`lib/features/clients/presentation/bloc/clients_state.dart`:
```dart
import 'package:equatable/equatable.dart';
import '../../domain/models/client.dart';

abstract class ClientsState extends Equatable {
  @override List<Object?> get props => [];
}
class ClientsInitial extends ClientsState {}
class ClientsLoading extends ClientsState {}
class ClientsLoaded extends ClientsState {
  final List<Client> clients;
  ClientsLoaded(this.clients);
  @override List<Object?> get props => [clients];
}
class ClientsError extends ClientsState {
  final String message;
  ClientsError(this.message);
  @override List<Object?> get props => [message];
}
```

`lib/features/clients/presentation/bloc/clients_bloc.dart`:
```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/clients_repository.dart';
import 'clients_event.dart';
import 'clients_state.dart';

class ClientsBloc extends Bloc<ClientsEvent, ClientsState> {
  final ClientsRepository _repository;

  ClientsBloc({required ClientsRepository repository})
      : _repository = repository,
        super(ClientsInitial()) {
    on<ClientsLoadRequested>(_onLoad);
    on<ClientsSearchChanged>(_onSearch);
  }

  Future<void> _onLoad(ClientsLoadRequested event, Emitter<ClientsState> emit) async {
    emit(ClientsLoading());
    try {
      final clients = await _repository.getClients();
      await _repository.cacheClients(clients);
      emit(ClientsLoaded(clients));
    } catch (_) {
      try {
        final cached = await _repository.getCachedClients();
        emit(ClientsLoaded(cached));
      } catch (e) {
        emit(ClientsError('No se pudo cargar los clientes.'));
      }
    }
  }

  Future<void> _onSearch(ClientsSearchChanged event, Emitter<ClientsState> emit) async {
    emit(ClientsLoading());
    try {
      final clients = await _repository.getClients(search: event.query);
      emit(ClientsLoaded(clients));
    } catch (_) {
      emit(ClientsError('Error al buscar.'));
    }
  }
}
```

**Step 5: Commit**

```bash
git add lib/features/clients/ test/unit/clients/
git commit -m "feat: add clients repository and BLoC"
```

---

## Task 15: Feature Clients — UI (List + Create)

**Files:**
- Modify: `lib/features/clients/presentation/pages/clients_list_page.dart`
- Modify: `lib/features/clients/presentation/pages/client_create_page.dart`

**Step 1: Create clients list page**

`lib/features/clients/presentation/pages/clients_list_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../bloc/clients_bloc.dart';
import '../bloc/clients_event.dart';
import '../bloc/clients_state.dart';

class ClientsListPage extends StatefulWidget {
  const ClientsListPage({super.key});
  @override State<ClientsListPage> createState() => _ClientsListPageState();
}

class _ClientsListPageState extends State<ClientsListPage> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clientes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/clients/new'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              decoration: const InputDecoration(
                hintText: 'Buscar cliente...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (q) => context.read<ClientsBloc>().add(ClientsSearchChanged(q)),
            ),
          ),
          Expanded(
            child: BlocBuilder<ClientsBloc, ClientsState>(
              builder: (context, state) {
                if (state is ClientsLoading) return const Center(child: CircularProgressIndicator());
                if (state is ClientsError) return Center(child: Text(state.message));
                if (state is ClientsLoaded) {
                  if (state.clients.isEmpty) {
                    return const Center(child: Text('No hay clientes. Agrega uno.'));
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.clients.length,
                    itemBuilder: (_, i) {
                      final c = state.clients[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          title: Text(c.name),
                          subtitle: c.companyName != null ? Text(c.companyName!) : null,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () {},
                        ),
                      );
                    },
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

**Step 2: Create client create page**

`lib/features/clients/presentation/pages/client_create_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/clients_repository.dart';

class ClientCreatePage extends StatefulWidget {
  const ClientCreatePage({super.key});
  @override State<ClientCreatePage> createState() => _ClientCreatePageState();
}

class _ClientCreatePageState extends State<ClientCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _companyCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _companyCtrl.dispose();
    _emailCtrl.dispose(); _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);
    try {
      final repo = context.read<ClientsRepository>();
      await repo.createClient(
        name: _nameCtrl.text.trim(),
        companyName: _companyCtrl.text.trim().isEmpty ? null : _companyCtrl.text.trim(),
        email: _emailCtrl.text.trim().isEmpty ? null : _emailCtrl.text.trim(),
        phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cliente creado'), backgroundColor: AppColors.success));
        context.pop(true); // return true to reload list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al crear cliente'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo Cliente')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(children: [
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (v) => (v?.trim().isEmpty ?? true) ? 'Requerido' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(controller: _companyCtrl, decoration: const InputDecoration(labelText: 'Empresa')),
            const SizedBox(height: 16),
            TextFormField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Correo electronico')),
            const SizedBox(height: 16),
            TextFormField(controller: _phoneCtrl, keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Telefono')),
            const SizedBox(height: 32),
            _loading
                ? const CircularProgressIndicator()
                : ElevatedButton(onPressed: _submit, child: const Text('Guardar Cliente')),
          ]),
        ),
      ),
    );
  }
}
```

**Step 3: Commit**

```bash
git add lib/features/clients/presentation/pages/
git commit -m "feat: add clients list and create screens"
```

---

## Task 16: Feature Quotes — Domain, Repository

**Files:**
- Create: `lib/features/quotes/domain/models/quote.dart`
- Create: `lib/features/quotes/domain/models/quote_item.dart`
- Create: `lib/features/quotes/domain/quotes_repository.dart`
- Create: `lib/features/quotes/data/quotes_repository_impl.dart`
- Test: `test/unit/quotes/quotes_repository_test.dart`

**Step 1: Create models**

`lib/features/quotes/domain/models/quote_item.dart`:
```dart
import 'package:equatable/equatable.dart';

class QuoteItem extends Equatable {
  final String? id;
  final String? serviceId;
  final String description;
  final double quantity;
  final double unitPrice;
  final String unitType;
  final double subtotal;

  const QuoteItem({
    this.id,
    this.serviceId,
    required this.description,
    required this.quantity,
    required this.unitPrice,
    required this.unitType,
    required this.subtotal,
  });

  factory QuoteItem.fromJson(Map<String, dynamic> json) => QuoteItem(
        id: json['id'] as String?,
        serviceId: json['service_id'] as String?,
        description: json['description'] as String,
        quantity: double.parse(json['quantity'].toString()),
        unitPrice: double.parse(json['unit_price'].toString()),
        unitType: json['unit_type'] as String,
        subtotal: double.parse(json['subtotal'].toString()),
      );

  Map<String, dynamic> toJson() => {
        if (serviceId != null) 'service_id': serviceId,
        'description': description,
        'quantity': quantity,
        'unit_price': unitPrice,
        'unit_type': unitType,
      };

  @override
  List<Object?> get props => [id, description, quantity, unitPrice, unitType];
}
```

`lib/features/quotes/domain/models/quote.dart`:
```dart
import 'package:equatable/equatable.dart';
import '../../../clients/domain/models/client.dart';
import 'quote_item.dart';

class Quote extends Equatable {
  final String id;
  final String number;
  final String status;
  final Client? client;
  final List<QuoteItem> items;
  final double subtotal;
  final double tax;
  final double total;
  final DateTime validUntil;
  final String? termsAndConditions;
  final DateTime createdAt;

  const Quote({
    required this.id,
    required this.number,
    required this.status,
    this.client,
    required this.items,
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.validUntil,
    this.termsAndConditions,
    required this.createdAt,
  });

  factory Quote.fromJson(Map<String, dynamic> json) {
    final clientJson = json['clients'] as Map<String, dynamic>?;
    return Quote(
      id: json['id'] as String,
      number: json['quote_number'] as String,
      status: json['status'] as String,
      client: clientJson != null
          ? Client(
              id: json['client_id'] as String,
              name: clientJson['name'] as String,
              companyName: clientJson['company_name'] as String?,
            )
          : null,
      items: (json['quote_items'] as List<dynamic>? ?? [])
          .map((i) => QuoteItem.fromJson(i as Map<String, dynamic>))
          .toList(),
      subtotal: double.parse((json['subtotal'] ?? '0').toString()),
      tax: double.parse((json['tax_amount'] ?? '0').toString()),
      total: double.parse((json['total_amount'] ?? '0').toString()),
      validUntil: DateTime.parse(json['valid_until'] as String),
      termsAndConditions: json['terms_and_conditions'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  static const statusLabels = {
    'draft': 'Borrador',
    'sent': 'Enviada',
    'viewed': 'Vista',
    'accepted': 'Aceptada',
    'rejected': 'Rechazada',
    'expired': 'Vencida',
  };

  String get statusLabel => statusLabels[status] ?? status;

  @override
  List<Object?> get props => [id, number, status];
}
```

**Step 2: Create abstract repository**

`lib/features/quotes/domain/quotes_repository.dart`:
```dart
import 'models/quote.dart';

abstract class QuotesRepository {
  Future<List<Quote>> getQuotes({int limit, int offset});
  Future<Quote> getQuote(String id);
  Future<Quote> createQuote({
    required String clientId,
    required DateTime validUntil,
    required List<Map<String, dynamic>> items,
    String? termsAndConditions,
  });
  Future<void> sendQuote(String id, List<String> channels);
  Future<String> getQuotePdfUrl(String id);
}
```

**Step 3: Create implementation**

`lib/features/quotes/data/quotes_repository_impl.dart`:
```dart
import '../../../core/http/api_client.dart';
import '../domain/models/quote.dart';
import '../domain/quotes_repository.dart';

class QuotesRepositoryImpl implements QuotesRepository {
  final ApiClient _apiClient;

  QuotesRepositoryImpl({required ApiClient apiClient}) : _apiClient = apiClient;

  @override
  Future<List<Quote>> getQuotes({int limit = 20, int offset = 0}) async {
    final response = await _apiClient.dio.get('/quotes',
        queryParameters: {'limit': limit, 'offset': offset});
    final data = response.data['data'] as List<dynamic>;
    return data.map((j) => Quote.fromJson(j as Map<String, dynamic>)).toList();
  }

  @override
  Future<Quote> getQuote(String id) async {
    final response = await _apiClient.dio.get('/quotes/$id');
    return Quote.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Future<Quote> createQuote({
    required String clientId,
    required DateTime validUntil,
    required List<Map<String, dynamic>> items,
    String? termsAndConditions,
  }) async {
    final response = await _apiClient.dio.post('/quotes', data: {
      'client_id': clientId,
      'valid_until': validUntil.toUtc().toIso8601String(),  // ISO datetime required
      'items': items,
      if (termsAndConditions != null) 'terms_and_conditions': termsAndConditions,
    });
    return Quote.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  @override
  Future<void> sendQuote(String id, List<String> channels) async {
    await _apiClient.dio.post('/quotes/$id/send', data: {'send_via': channels});
  }

  @override
  Future<String> getQuotePdfUrl(String id) async {
    final baseUrl = _apiClient.dio.options.baseUrl.replaceAll('/api', '');
    return '$baseUrl/api/export/quote/$id';
  }
}
```

**Step 4: Commit**

```bash
git add lib/features/quotes/
git commit -m "feat: add quotes repository with full CRUD"
```

---

## Task 17: Feature Quotes — BLoC

**Files:**
- Create: `lib/features/quotes/presentation/bloc/quotes_bloc.dart`
- Create: `lib/features/quotes/presentation/bloc/quotes_event.dart`
- Create: `lib/features/quotes/presentation/bloc/quotes_state.dart`

**Step 1: Create events**

`lib/features/quotes/presentation/bloc/quotes_event.dart`:
```dart
import '../../domain/models/quote_item.dart';

abstract class QuotesEvent {}
class QuotesLoadRequested extends QuotesEvent {}

class QuoteCreateRequested extends QuotesEvent {
  final String clientId;
  final DateTime validUntil;
  final List<QuoteItem> items;
  final String? termsAndConditions;
  QuoteCreateRequested({
    required this.clientId,
    required this.validUntil,
    required this.items,
    this.termsAndConditions,
  });
}

class QuoteSendRequested extends QuotesEvent {
  final String quoteId;
  final List<String> channels;
  QuoteSendRequested({required this.quoteId, required this.channels});
}
```

**Step 2: Create states**

`lib/features/quotes/presentation/bloc/quotes_state.dart`:
```dart
import 'package:equatable/equatable.dart';
import '../../domain/models/quote.dart';

abstract class QuotesState extends Equatable {
  @override List<Object?> get props => [];
}
class QuotesInitial extends QuotesState {}
class QuotesLoading extends QuotesState {}
class QuotesLoaded extends QuotesState {
  final List<Quote> quotes;
  QuotesLoaded(this.quotes);
  @override List<Object?> get props => [quotes];
}
class QuoteCreated extends QuotesState {
  final Quote quote;
  QuoteCreated(this.quote);
  @override List<Object?> get props => [quote];
}
class QuoteSent extends QuotesState {}
class QuotesError extends QuotesState {
  final String message;
  QuotesError(this.message);
  @override List<Object?> get props => [message];
}
```

**Step 3: Create BLoC**

`lib/features/quotes/presentation/bloc/quotes_bloc.dart`:
```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/quotes_repository.dart';
import 'quotes_event.dart';
import 'quotes_state.dart';

class QuotesBloc extends Bloc<QuotesEvent, QuotesState> {
  final QuotesRepository _repository;

  QuotesBloc({required QuotesRepository repository})
      : _repository = repository,
        super(QuotesInitial()) {
    on<QuotesLoadRequested>(_onLoad);
    on<QuoteCreateRequested>(_onCreate);
    on<QuoteSendRequested>(_onSend);
  }

  Future<void> _onLoad(QuotesLoadRequested event, Emitter<QuotesState> emit) async {
    emit(QuotesLoading());
    try {
      final quotes = await _repository.getQuotes();
      emit(QuotesLoaded(quotes));
    } catch (e) {
      emit(QuotesError('No se pudo cargar las cotizaciones.'));
    }
  }

  Future<void> _onCreate(QuoteCreateRequested event, Emitter<QuotesState> emit) async {
    emit(QuotesLoading());
    try {
      final quote = await _repository.createQuote(
        clientId: event.clientId,
        validUntil: event.validUntil,
        items: event.items.map((i) => i.toJson()).toList(),
        termsAndConditions: event.termsAndConditions,
      );
      emit(QuoteCreated(quote));
    } catch (e) {
      emit(QuotesError('No se pudo crear la cotizacion.'));
    }
  }

  Future<void> _onSend(QuoteSendRequested event, Emitter<QuotesState> emit) async {
    emit(QuotesLoading());
    try {
      await _repository.sendQuote(event.quoteId, event.channels);
      emit(QuoteSent());
    } catch (e) {
      emit(QuotesError('No se pudo enviar la cotizacion.'));
    }
  }
}
```

**Step 4: Commit**

```bash
git add lib/features/quotes/presentation/bloc/
git commit -m "feat: add quotes BLoC with create/send"
```

---

## Task 18: Feature Quotes — UI (List + Detail + Send)

**Files:**
- Modify: `lib/features/quotes/presentation/pages/quotes_list_page.dart`
- Modify: `lib/features/quotes/presentation/pages/quote_detail_page.dart`

**Step 1: Quotes list page**

`lib/features/quotes/presentation/pages/quotes_list_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../bloc/quotes_bloc.dart';
import '../bloc/quotes_event.dart';
import '../bloc/quotes_state.dart';

class QuotesListPage extends StatelessWidget {
  const QuotesListPage({super.key});

  static const _statusColors = {
    'draft': AppColors.textSecondary,
    'sent': AppColors.primaryLight,
    'accepted': AppColors.success,
    'rejected': AppColors.error,
    'expired': AppColors.warning,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cotizaciones')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/quotes/new'),
        icon: const Icon(Icons.add),
        label: const Text('Nueva'),
      ),
      body: BlocBuilder<QuotesBloc, QuotesState>(
        builder: (context, state) {
          if (state is QuotesLoading) return const Center(child: CircularProgressIndicator());
          if (state is QuotesError) return Center(child: Text(state.message));
          if (state is QuotesLoaded) {
            if (state.quotes.isEmpty) {
              return const Center(child: Text('Sin cotizaciones. Crea una nueva.'));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.quotes.length,
              itemBuilder: (_, i) {
                final q = state.quotes[i];
                final color = _statusColors[q.status] ?? AppColors.textSecondary;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(q.number, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(q.client?.displayName ?? 'Sin cliente'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('\$${NumberFormat('#,##0.00').format(q.total)}',
                            style: const TextStyle(fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4)),
                          child: Text(q.statusLabel,
                              style: TextStyle(color: color, fontSize: 12)),
                        ),
                      ],
                    ),
                    onTap: () => context.push('/quotes/${q.id}'),
                  ),
                );
              },
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
```

**Step 2: Quote detail + send page**

`lib/features/quotes/presentation/pages/quote_detail_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_colors.dart';
import '../../domain/quotes_repository.dart';
import '../../domain/models/quote.dart';
import '../bloc/quotes_bloc.dart';
import '../bloc/quotes_event.dart';
import '../bloc/quotes_state.dart';

class QuoteDetailPage extends StatefulWidget {
  final String id;
  const QuoteDetailPage({super.key, required this.id});
  @override State<QuoteDetailPage> createState() => _QuoteDetailPageState();
}

class _QuoteDetailPageState extends State<QuoteDetailPage> {
  Quote? _quote;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadQuote();
  }

  Future<void> _loadQuote() async {
    try {
      final repo = context.read<QuotesRepository>();
      final quote = await repo.getQuote(widget.id);
      setState(() { _quote = quote; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _sendWhatsApp() async {
    final q = _quote!;
    final phone = q.client?.phone ?? '';
    final repo = context.read<QuotesRepository>();
    final pdfUrl = await repo.getQuotePdfUrl(q.id);
    final message = Uri.encodeComponent(
        'Hola ${q.client?.name ?? ''}, te comparto la cotizacion ${q.number}: $pdfUrl');
    final uri = Uri.parse('whatsapp://send?phone=$phone&text=$message');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('WhatsApp no esta instalado')));
      }
    }
  }

  void _sendEmail() {
    context.read<QuotesBloc>().add(QuoteSendRequested(
      quoteId: widget.id, channels: ['email']));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_quote == null) return const Scaffold(body: Center(child: Text('Cotizacion no encontrada')));

    final q = _quote!;
    final fmt = NumberFormat('#,##0.00');

    return BlocListener<QuotesBloc, QuotesState>(
      listener: (context, state) {
        if (state is QuoteSent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cotizacion enviada por correo'), backgroundColor: AppColors.success));
        }
        if (state is QuotesError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error));
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(q.number)),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(q.client?.displayName ?? 'Sin cliente',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text('Valida hasta: ${DateFormat('dd/MM/yyyy').format(q.validUntil)}'),
                    Text('Estado: ${q.statusLabel}'),
                  ]),
                ),
              ),
              const SizedBox(height: 16),
              const Text('Servicios', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...q.items.map((item) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(item.description),
                      subtitle: Text('${item.quantity} x \$${fmt.format(item.unitPrice)}'),
                      trailing: Text('\$${fmt.format(item.subtotal)}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  )),
              const Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [const Text('Subtotal'), Text('\$${fmt.format(q.subtotal)}')]),
              ),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [const Text('IVA (16%)'), Text('\$${fmt.format(q.tax)}')]),
              const Divider(),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('TOTAL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('\$${fmt.format(q.total)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
              ]),
              const SizedBox(height: 32),
              const Text('Enviar cotizacion', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _sendWhatsApp,
                    icon: const Icon(Icons.chat),
                    label: const Text('WhatsApp'),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _sendEmail,
                    icon: const Icon(Icons.email),
                    label: const Text('Email'),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}
```

**Step 3: Commit**

```bash
git add lib/features/quotes/presentation/pages/
git commit -m "feat: add quotes list and detail screens with send"
```

---

## Task 19: Feature Quotes — Create Wizard (3 steps)

**Files:**
- Modify: `lib/features/quotes/presentation/pages/quote_create_page.dart`
- Create: `lib/features/quotes/presentation/widgets/step_client.dart`
- Create: `lib/features/quotes/presentation/widgets/step_services.dart`
- Create: `lib/features/quotes/presentation/widgets/step_review.dart`

**Step 1: Create the wizard page**

`lib/features/quotes/presentation/pages/quote_create_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../clients/domain/models/client.dart';
import '../../../services/domain/models/service.dart';
import '../../domain/models/quote_item.dart';
import '../bloc/quotes_bloc.dart';
import '../bloc/quotes_event.dart';
import '../bloc/quotes_state.dart';
import '../widgets/step_client.dart';
import '../widgets/step_services.dart';
import '../widgets/step_review.dart';

class QuoteCreatePage extends StatefulWidget {
  const QuoteCreatePage({super.key});
  @override State<QuoteCreatePage> createState() => _QuoteCreatePageState();
}

class _QuoteCreatePageState extends State<QuoteCreatePage> {
  int _step = 0;
  Client? _selectedClient;
  final List<QuoteItem> _items = [];
  DateTime _validUntil = DateTime.now().add(const Duration(days: 30));
  String _terms = '';

  final _steps = ['Cliente', 'Servicios', 'Revision'];

  void _addItem(Service service) {
    setState(() {
      _items.add(QuoteItem(
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: service.unitPrice,
        unitType: service.unitType,
        subtotal: service.unitPrice,
      ));
    });
  }

  void _removeItem(int index) => setState(() => _items.removeAt(index));

  void _updateQuantity(int index, double qty) {
    setState(() {
      final item = _items[index];
      _items[index] = QuoteItem(
        serviceId: item.serviceId,
        description: item.description,
        quantity: qty,
        unitPrice: item.unitPrice,
        unitType: item.unitType,
        subtotal: qty * item.unitPrice,
      );
    });
  }

  double get _subtotal => _items.fold(0, (sum, i) => sum + i.subtotal);
  double get _tax => _subtotal * 0.16;
  double get _total => _subtotal + _tax;

  void _submit() {
    context.read<QuotesBloc>().add(QuoteCreateRequested(
      clientId: _selectedClient!.id,
      validUntil: _validUntil,
      items: _items,
      termsAndConditions: _terms.isEmpty ? null : _terms,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<QuotesBloc, QuotesState>(
      listener: (context, state) {
        if (state is QuoteCreated) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cotizacion creada'), backgroundColor: AppColors.success));
          context.go('/quotes/${state.quote.id}');
        }
        if (state is QuotesError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error));
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text('Nueva Cotizacion — ${_steps[_step]}'),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4),
            child: LinearProgressIndicator(value: (_step + 1) / _steps.length),
          ),
        ),
        body: IndexedStack(
          index: _step,
          children: [
            StepClient(
              selectedClient: _selectedClient,
              onSelected: (c) => setState(() => _selectedClient = c),
              onNext: () => setState(() => _step = 1),
            ),
            StepServices(
              items: _items,
              onAdd: _addItem,
              onRemove: _removeItem,
              onUpdateQty: _updateQuantity,
              onBack: () => setState(() => _step = 0),
              onNext: () => setState(() => _step = 2),
            ),
            StepReview(
              items: _items,
              client: _selectedClient,
              subtotal: _subtotal,
              tax: _tax,
              total: _total,
              validUntil: _validUntil,
              terms: _terms,
              onValidUntilChanged: (d) => setState(() => _validUntil = d),
              onTermsChanged: (t) => setState(() => _terms = t),
              onBack: () => setState(() => _step = 1),
              onSubmit: _submit,
            ),
          ],
        ),
      ),
    );
  }
}
```

**Step 2: Create StepClient widget**

`lib/features/quotes/presentation/widgets/step_client.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../clients/domain/models/client.dart';
import '../../../clients/presentation/bloc/clients_bloc.dart';
import '../../../clients/presentation/bloc/clients_event.dart';
import '../../../clients/presentation/bloc/clients_state.dart';

class StepClient extends StatelessWidget {
  final Client? selectedClient;
  final ValueChanged<Client> onSelected;
  final VoidCallback onNext;

  const StepClient({
    super.key,
    required this.selectedClient,
    required this.onSelected,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            decoration: const InputDecoration(hintText: 'Buscar cliente...', prefixIcon: Icon(Icons.search)),
            onChanged: (q) => context.read<ClientsBloc>().add(ClientsSearchChanged(q)),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: () async {
              final result = await context.push<bool>('/clients/new');
              if (result == true) {
                context.read<ClientsBloc>().add(ClientsLoadRequested());
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Nuevo cliente'),
          ),
          Expanded(
            child: BlocBuilder<ClientsBloc, ClientsState>(
              builder: (context, state) {
                if (state is ClientsLoading) return const Center(child: CircularProgressIndicator());
                if (state is ClientsLoaded) {
                  return ListView.builder(
                    itemCount: state.clients.length,
                    itemBuilder: (_, i) {
                      final c = state.clients[i];
                      final selected = selectedClient?.id == c.id;
                      return ListTile(
                        title: Text(c.name),
                        subtitle: c.companyName != null ? Text(c.companyName!) : null,
                        selected: selected,
                        trailing: selected ? const Icon(Icons.check_circle, color: Colors.blue) : null,
                        onTap: () => onSelected(c),
                      );
                    },
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
          ElevatedButton(
            onPressed: selectedClient != null ? onNext : null,
            child: const Text('Siguiente'),
          ),
        ],
      ),
    );
  }
}
```

**Step 3: Create StepServices widget**

`lib/features/quotes/presentation/widgets/step_services.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../services/domain/models/service.dart';
import '../../../services/presentation/bloc/services_bloc.dart';
import '../../../services/presentation/bloc/services_state.dart';
import '../../domain/models/quote_item.dart';

class StepServices extends StatelessWidget {
  final List<QuoteItem> items;
  final ValueChanged<Service> onAdd;
  final ValueChanged<int> onRemove;
  final void Function(int, double) onUpdateQty;
  final VoidCallback onBack;
  final VoidCallback onNext;

  const StepServices({
    super.key,
    required this.items,
    required this.onAdd,
    required this.onRemove,
    required this.onUpdateQty,
    required this.onBack,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.00');
    return Column(
      children: [
        Expanded(
          child: BlocBuilder<ServicesBloc, ServicesState>(
            builder: (context, state) {
              if (state is ServicesLoaded) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (items.isNotEmpty) ...[
                      const Text('Seleccionados:', style: TextStyle(fontWeight: FontWeight.bold)),
                      ...items.asMap().entries.map((e) => ListTile(
                            title: Text(e.value.description),
                            subtitle: Text('\$${fmt.format(e.value.subtotal)}'),
                            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(
                                icon: const Icon(Icons.remove),
                                onPressed: () {
                                  if (e.value.quantity > 1) onUpdateQty(e.key, e.value.quantity - 1);
                                },
                              ),
                              Text(e.value.quantity.toStringAsFixed(0)),
                              IconButton(
                                icon: const Icon(Icons.add),
                                onPressed: () => onUpdateQty(e.key, e.value.quantity + 1),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () => onRemove(e.key),
                              ),
                            ]),
                          )),
                      const Divider(),
                    ],
                    const Text('Catalogo:', style: TextStyle(fontWeight: FontWeight.bold)),
                    ...state.services.map((s) => ListTile(
                          title: Text(s.name),
                          subtitle: Text('\$${fmt.format(s.unitPrice)} ${s.unitTypeLabel}'),
                          trailing: IconButton(
                            icon: const Icon(Icons.add_circle_outline),
                            onPressed: () => onAdd(s),
                          ),
                        )),
                  ],
                );
              }
              return const Center(child: CircularProgressIndicator());
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: OutlinedButton(onPressed: onBack, child: const Text('Atras'))),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: items.isNotEmpty ? onNext : null,
                child: const Text('Siguiente'),
              ),
            ),
          ]),
        ),
      ],
    );
  }
}
```

**Step 4: Create StepReview widget**

`lib/features/quotes/presentation/widgets/step_review.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../clients/domain/models/client.dart';
import '../../domain/models/quote_item.dart';
import '../bloc/quotes_state.dart';
import '../bloc/quotes_bloc.dart';

class StepReview extends StatelessWidget {
  final List<QuoteItem> items;
  final Client? client;
  final double subtotal;
  final double tax;
  final double total;
  final DateTime validUntil;
  final String terms;
  final ValueChanged<DateTime> onValidUntilChanged;
  final ValueChanged<String> onTermsChanged;
  final VoidCallback onBack;
  final VoidCallback onSubmit;

  const StepReview({
    super.key,
    required this.items,
    required this.client,
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.validUntil,
    required this.terms,
    required this.onValidUntilChanged,
    required this.onTermsChanged,
    required this.onBack,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0.00');
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Cliente: ${client?.displayName ?? ""}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ...items.map((i) => ListTile(
                    dense: true,
                    title: Text(i.description),
                    trailing: Text('\$${fmt.format(i.subtotal)}'),
                  )),
              const Divider(),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [const Text('Subtotal'), Text('\$${fmt.format(subtotal)}')]),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [const Text('IVA 16%'), Text('\$${fmt.format(tax)}')]),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('TOTAL', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('\$${fmt.format(total)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
              ]),
              const SizedBox(height: 16),
              ListTile(
                title: const Text('Valida hasta'),
                trailing: TextButton(
                  child: Text(DateFormat('dd/MM/yyyy').format(validUntil)),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: validUntil,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) onValidUntilChanged(picked);
                  },
                ),
              ),
              TextFormField(
                initialValue: terms,
                decoration: const InputDecoration(labelText: 'Terminos y condiciones (opcional)'),
                maxLines: 3,
                onChanged: onTermsChanged,
              ),
            ]),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Expanded(child: OutlinedButton(onPressed: onBack, child: const Text('Atras'))),
            const SizedBox(width: 12),
            Expanded(
              child: BlocBuilder<QuotesBloc, QuotesState>(
                builder: (context, state) {
                  if (state is QuotesLoading) return const Center(child: CircularProgressIndicator());
                  return ElevatedButton(
                    onPressed: onSubmit,
                    child: const Text('Crear Cotizacion'),
                  );
                },
              ),
            ),
          ]),
        ),
      ],
    );
  }
}
```

**Step 5: Commit**

```bash
git add lib/features/quotes/
git commit -m "feat: add quote create wizard with 3 steps"
```

---

## Task 20: Feature Dashboard

**Files:**
- Modify: `lib/features/dashboard/presentation/pages/dashboard_page.dart`

**Step 1: Create dashboard page**

`lib/features/dashboard/presentation/pages/dashboard_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../quotes/presentation/bloc/quotes_bloc.dart';
import '../../../quotes/presentation/bloc/quotes_state.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('CotizaPro'),
        actions: [
          IconButton(icon: const Icon(Icons.person_outline), onPressed: () => context.go('/profile')),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bienvenido', style: TextStyle(color: AppColors.textSecondary)),
            Text(email, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            // Quick actions
            const Text('Acciones Rapidas', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: _QuickAction(
                  icon: Icons.add_circle,
                  label: 'Nueva\nCotizacion',
                  color: AppColors.primary,
                  onTap: () => context.push('/quotes/new'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickAction(
                  icon: Icons.person_add,
                  label: 'Nuevo\nCliente',
                  color: AppColors.success,
                  onTap: () => context.push('/clients/new'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickAction(
                  icon: Icons.description,
                  label: 'Ver\nCotizaciones',
                  color: AppColors.warning,
                  onTap: () => context.go('/quotes'),
                ),
              ),
            ]),
            const SizedBox(height: 32),
            const Text('Cotizaciones Recientes', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 12),
            BlocBuilder<QuotesBloc, QuotesState>(
              builder: (context, state) {
                if (state is QuotesLoaded) {
                  final recent = state.quotes.take(5).toList();
                  return Column(
                    children: recent.map((q) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(q.number),
                        subtitle: Text(q.client?.displayName ?? ''),
                        trailing: Text(q.statusLabel),
                        onTap: () => context.push('/quotes/${q.id}'),
                      ),
                    )).toList(),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(label, textAlign: TextAlign.center,
              style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add lib/features/dashboard/
git commit -m "feat: add dashboard with quick actions and recent quotes"
```

---

## Task 21: Feature Profile

**Files:**
- Modify: `lib/features/profile/presentation/pages/profile_page.dart`

**Step 1: Create profile page**

`lib/features/profile/presentation/pages/profile_page.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/auth/presentation/bloc/auth_event.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Mi Perfil')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(radius: 40, child: Icon(Icons.person, size: 40)),
            const SizedBox(height: 16),
            Text(user?.email ?? '', style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 8),
            Text('ID: ${user?.id?.substring(0, 8) ?? ''}...',
                style: const TextStyle(color: Colors.grey)),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () => context.read<AuthBloc>().add(AuthSignOutRequested()),
              icon: const Icon(Icons.logout),
              label: const Text('Cerrar Sesion'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add lib/features/profile/
git commit -m "feat: add profile page with logout"
```

---

## Task 22: Wire Up DI — Register All Repositories in service_locator

**Files:**
- Modify: `lib/core/di/service_locator.dart`

**Step 1: Register all repositories**

`lib/core/di/service_locator.dart`:
```dart
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get_it/get_it.dart';
import '../http/api_client.dart';
import '../../features/auth/data/auth_repository_impl.dart';
import '../../features/auth/domain/auth_repository.dart';
import '../../features/clients/data/clients_repository_impl.dart';
import '../../features/clients/domain/clients_repository.dart';
import '../../features/services/data/services_repository_impl.dart';
import '../../features/services/domain/services_repository.dart';
import '../../features/quotes/data/quotes_repository_impl.dart';
import '../../features/quotes/domain/quotes_repository.dart';

final GetIt sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  final baseUrl = dotenv.env['API_BASE_URL'] ?? 'http://localhost:3000';

  // Core
  sl.registerLazySingleton<ApiClient>(() => ApiClient(baseUrl: baseUrl));

  // Repositories
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl());
  sl.registerLazySingleton<ClientsRepository>(() => ClientsRepositoryImpl(apiClient: sl()));
  sl.registerLazySingleton<ServicesRepository>(() => ServicesRepositoryImpl(apiClient: sl()));
  sl.registerLazySingleton<QuotesRepository>(() => QuotesRepositoryImpl(apiClient: sl()));
}
```

**Step 2: Commit**

```bash
git add lib/core/di/
git commit -m "chore: register all repositories in service locator"
```

---

## Task 23: Wire Up BLoCs — Provide all BLoCs at App Level

**Files:**
- Modify: `lib/main.dart`

**Step 1: Update main.dart to provide all BLoCs**

`lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/cache/hive_cache.dart';
import 'core/di/service_locator.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/clients/presentation/bloc/clients_bloc.dart';
import 'features/services/presentation/bloc/services_bloc.dart';
import 'features/quotes/presentation/bloc/quotes_bloc.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const env = String.fromEnvironment('ENV', defaultValue: 'development');
  await dotenv.load(fileName: '.env.$env');

  await HiveCache.initialize();

  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  await setupServiceLocator();

  runApp(const CotizaProApp());
}

class CotizaProApp extends StatelessWidget {
  const CotizaProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => AuthBloc(repository: sl())),
        BlocProvider(create: (_) => ClientsBloc(repository: sl())..add(ClientsLoadRequested())),
        BlocProvider(create: (_) => ServicesBloc(repository: sl())..add(ServicesLoadRequested())),
        BlocProvider(create: (_) => QuotesBloc(repository: sl())..add(QuotesLoadRequested())),
      ],
      child: MaterialApp.router(
        title: 'CotizaPro',
        theme: AppTheme.light,
        routerConfig: AppRouter.router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
```

**Step 2: Also provide repositories for direct injection in create page**

In `lib/core/router/app_router.dart`, wrap ShellRoute with RepositoryProvider:
```dart
// Add to imports
import 'package:flutter_bloc/flutter_bloc.dart';

// Wrap ShellRoute in MultiRepositoryProvider
MultiRepositoryProvider(
  providers: [
    RepositoryProvider<ClientsRepository>(create: (_) => sl()),
    RepositoryProvider<QuotesRepository>(create: (_) => sl()),
  ],
  child: ShellRoute(...)
)
```

**Step 3: Run flutter analyze**

```bash
flutter analyze
```

Expected: No issues

**Step 4: Commit**

```bash
git add lib/main.dart lib/core/router/
git commit -m "feat: wire up all BLoCs and repositories at app level"
```

---

## Task 24: Integration Test — Full Happy Path

**Files:**
- Create: `integration_test/app_test.dart`

**Step 1: Create integration test**

`integration_test/app_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:cotizapro_mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Happy path integration test', () {
    testWidgets('Login → Dashboard → Navigate to Quotes', (tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Should show login
      expect(find.text('Iniciar sesion'), findsOneWidget);

      // Login with demo account
      await tester.enterText(
          find.byType(TextFormField).first, 'demo@climasol.mx');
      await tester.enterText(
          find.byType(TextFormField).last, 'ClimaSol2026!');
      await tester.tap(find.text('Iniciar sesion'));
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Should show dashboard
      expect(find.text('Acciones Rapidas'), findsOneWidget);

      // Navigate to quotes
      await tester.tap(find.text('Cotizaciones'));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      expect(find.text('Nueva'), findsOneWidget);
    });
  });
}
```

**Step 2: Run integration test (Android device required)**

```bash
flutter test integration_test/app_test.dart
```

**Step 3: Commit**

```bash
git add integration_test/
git commit -m "test: add integration test for login and navigation"
```

---

## Task 25: CI/CD — GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test --coverage
      - name: Check coverage
        run: |
          COVERAGE=$(lcov --summary coverage/lcov.info 2>&1 | grep "lines" | awk '{print $2}' | tr -d '%')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage below 70%"
            exit 1
          fi

  build-android:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
      - run: flutter pub get
      - run: flutter build apk --release --dart-define=ENV=production
      - uses: actions/upload-artifact@v4
        with:
          name: android-release
          path: build/app/outputs/flutter-apk/app-release.apk
```

**Step 2: Create GitHub repo and push**

```bash
git remote add origin https://github.com/YOUR_USERNAME/cotizapro-mobile.git
git push -u origin main
```

**Step 3: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions CI/CD pipeline"
```

---

## Task 26: Final — Run All Tests & flutter analyze

**Step 1: Run all unit tests**

```bash
flutter test
```

Expected: All tests PASS

**Step 2: Run flutter analyze**

```bash
flutter analyze
```

Expected: No issues

**Step 3: Build Android APK (debug)**

```bash
flutter build apk --debug --dart-define=ENV=development
```

Expected: APK built at `build/app/outputs/flutter-apk/app-debug.apk`

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: final verification — all tests pass, no analysis issues"
```

---

## Summary

After completing all 26 tasks, you will have:

- A fully functional Flutter mobile app for CotizaPro field technicians
- Authentication via Supabase (same backend as web)
- Offline catalog and clients (Hive cache)
- Complete quote creation wizard (3 steps)
- Quote sending via WhatsApp native + Email API
- Android + iOS support
- 70%+ test coverage
- CI/CD via GitHub Actions

**Demo credentials**: `demo@climasol.mx` / `ClimaSol2026!`

**Key gotchas to remember**:
- `unit_price` from API is a string — always `double.parse()`
- `valid_until` must be ISO datetime string — always `.toUtc().toIso8601String()`
- Quote field: `terms_and_conditions` (NOT `terms`)
- `unit_type` values: `fixed|per_hour|per_sqm|per_unit` (English, NOT Spanish)
