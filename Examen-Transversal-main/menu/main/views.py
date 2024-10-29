from django.shortcuts import get_object_or_404, render, redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .forms import ProductForm
from .models import Product, Category
import json
import logging
from django.views import View

logger = logging.getLogger(__name__)

def home(request):
    products = Product.objects.all()
    return render(request, 'home.html', {'products': products})

def add_product(request):
    if request.method == 'POST':
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('view_all_purchases')
    else:
        form = ProductForm()
    return render(request, 'add_product.html', {'form': form})

def add_admin(request):
    if request.method == 'POST':
        form = ProductForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.is_staff = True
            user.save()
            return redirect('home')
    else:
        form = ProductForm()
    return render(request, 'add_admin.html', {'form': form})

@csrf_exempt
@require_POST
def save_cart(request):
    try:
        data = json.loads(request.body)
        cart = data.get('cart', [])
        user = request.user

        purchase = Purchase.objects.create(nombre=user.username, email=user.email)

        for item in cart:
            product = get_object_or_404(Product, id=item['id'])
            quantity = item['quantity']
            PurchaseItem.objects.create(purchase=purchase, product=product, quantity=quantity)

        return JsonResponse({'success': True})

    except Exception as e:
        logger.error(f"Error al guardar el carrito: {e}")
        return JsonResponse({'success': False, 'error': str(e)})

def view_all_purchases(request):
    products = Product.objects.all()
    categories = Category.objects.all()

    if request.method == 'POST':
        # Agregar nuevo producto
        if 'add_product' in request.POST:
            form = ProductForm(request.POST, request.FILES)
            if form.is_valid():
                form.save()
                return redirect('view_all_purchases')  # Redirigir para mostrar el nuevo producto
            else:
                logger.error(f"Form error: {form.errors}")  # Registra errores del formulario

        # Editar o eliminar productos
        elif 'delete_product' in request.POST:
            product_id = request.POST.get('product_id')
            Product.objects.filter(id=product_id).delete()
            return redirect('view_all_purchases')

        elif 'edit_product' in request.POST:
            product_id = request.POST.get('product_id')
            product = get_object_or_404(Product, id=product_id)

            product.name = request.POST.get('name')
            product.price = request.POST.get('price')
            product.description = request.POST.get('description')
            product.category_id = request.POST.get('category')
            photo = request.FILES.get('photo')

            if photo:
                product.photo = photo

            product.save()
            return redirect('view_all_purchases')

        elif 'update_stock' in request.POST:
            product_id = request.POST.get('product_id')
            new_stock = request.POST.get('stock')
            product = get_object_or_404(Product, id=product_id)

            product.stock = new_stock
            product.save()
            return redirect('view_all_purchases')

    return render(request, 'view_all_purchases.html', {'products': products, 'categories': categories})

class SavePurchaseView(View):
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            purchase_data = data.get('purchase_data', [])

            for item in purchase_data:
                product_id = item['id']
                quantity = item['quantity']

                product = Product.objects.get(id=product_id)
                if product.stock >= quantity:
                    product.stock -= quantity
                    product.save()
                else:
                    return JsonResponse({'success': False, 'message': 'Stock insuficiente'}, status=400)

            return JsonResponse({'success': True}, status=200)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)
