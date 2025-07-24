from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
import json

def home(request):
    return render(request, 'main/home.html')

def dashboard(request):
    if request.user.is_authenticated:
        return render(request, 'main/dashboard.html', {'user': request.user})
    return redirect('home')

def logout_view(request):
    logout(request)
    return redirect('home')

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        try:
            user = User.objects.get(email=email)
            user = authenticate(request, username=user.username, password=password)
            if user:
                login(request, user)
                return JsonResponse({'success': True, 'redirect': '/dashboard/'})
            else:
                return JsonResponse({'success': False, 'error': 'Неверные данные для входа'})
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Пользователь не найден'})
    
    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        repeat_password = data.get('repeat_password')
        
        if password != repeat_password:
            return JsonResponse({'success': False, 'error': 'Пароли не совпадают'})
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Пользователь с таким email уже существует'})
        
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )
        
        login(request, user)
        return JsonResponse({'success': True, 'redirect': '/dashboard/'})
    
    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})