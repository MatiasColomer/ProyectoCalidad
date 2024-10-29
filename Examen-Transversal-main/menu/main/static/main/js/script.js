document.addEventListener('DOMContentLoaded', () => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const stockToast = new bootstrap.Toast(document.getElementById('stockToast'));

    const addToCartButtons = document.querySelectorAll('.add-to-cart');

    if (addToCartButtons.length > 0) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', () => {
                const productId = button.getAttribute('data-id');
                const productName = button.getAttribute('data-name');
                const productPrice = parseFloat(button.getAttribute('data-price'));
                let productStock = parseInt(button.getAttribute('data-stock'));

                const product = cart.find(item => item.id === productId);

                if (product) {
                    if (product.quantity + 1 > productStock) {
                        stockToast.show();
                    } else {
                        product.quantity += 1;
                    }
                } else {
                    if (productStock > 0) {
                        cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
                    } else {
                        stockToast.show();
                    }
                }

                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
            });
        });
    }

    const saveCartButton = document.getElementById('sendPurchaseButton');
    if (saveCartButton) {
        saveCartButton.addEventListener('click', () => {
            const purchaseData = JSON.parse(localStorage.getItem('cart')) || [];

            if (purchaseData.length === 0) {
                alert('El carrito está vacío. Agregue productos antes de proceder.');
                return;
            }

            const csrftoken = getCookie('csrftoken'); // Obtén el token CSRF
            const formData = { purchase_data: purchaseData };

            // Envío de la compra al servidor
            fetch('/save_purchase/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify(formData),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Actualiza el stock de los productos en el carrito
                    purchaseData.forEach(item => {
                        const productButton = document.querySelector(`button[data-id="${item.id}"]`);
                        let stock = parseInt(productButton.getAttribute('data-stock'));

                        // Asegúrate de que el stock no se vuelva negativo
                        stock -= item.quantity;  // Reducir el stock por la cantidad comprada
                        productButton.setAttribute('data-stock', stock); // Actualiza el atributo de stock en el botón
                    });

                    alert('¡Compra realizada exitosamente!');
                    localStorage.removeItem('cart');
                    cart = []; // Vaciar el carrito después de la compra
                    updateCartDisplay();

                    // Recargar la página
                    location.reload(); // Recargar la página después de una compra exitosa
                } else {
                    alert('Error al procesar la compra. Por favor, inténtelo de nuevo.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al procesar la compra. Por favor, inténtelo de nuevo.');
            });
        });
    }

    function updateCartDisplay() {
        const cartDisplay = document.getElementById('cartDisplay');
        const totalPriceElement = document.getElementById('totalPrice');
        let totalPrice = 0;

        if (cartDisplay) {
            cartDisplay.innerHTML = '';
            cart.forEach(item => {
                const cartItem = document.createElement('li');
                cartItem.className = 'list-group-item d-flex justify-content-between align-items-center';

                const itemInfo = document.createElement('span');
                itemInfo.textContent = `${item.name} - ${item.quantity} x $${item.price.toFixed(2)}`;
                cartItem.appendChild(itemInfo);

                const buttonGroup = document.createElement('div');

                const decreaseButton = document.createElement('button');
                decreaseButton.className = 'btn btn-outline-secondary btn-sm';
                decreaseButton.textContent = '-';
                decreaseButton.addEventListener('click', () => {
                    if (item.quantity > 1) {
                        item.quantity--;
                    } else {
                        cart = cart.filter(prod => prod.id !== item.id);
                    }
                    localStorage.setItem('cart', JSON.stringify(cart));
                    updateCartDisplay();
                });

                const increaseButton = document.createElement('button');
                increaseButton.className = 'btn btn-outline-secondary btn-sm ml-2';
                increaseButton.textContent = '+';
                increaseButton.addEventListener('click', () => {
                    const stock = parseInt(document.querySelector(`button[data-id="${item.id}"]`).getAttribute('data-stock'));
                    if (item.quantity + 1 > stock) {
                        stockToast.show();
                    } else {
                        item.quantity++;
                        localStorage.setItem('cart', JSON.stringify(cart));
                        updateCartDisplay();
                    }
                });

                const removeButton = document.createElement('button');
                removeButton.className = 'btn btn-danger btn-sm ml-2';
                removeButton.textContent = 'Eliminar';
                removeButton.addEventListener('click', () => {
                    cart = cart.filter(prod => prod.id !== item.id);
                    localStorage.setItem('cart', JSON.stringify(cart));
                    updateCartDisplay();
                });

                buttonGroup.appendChild(decreaseButton);
                buttonGroup.appendChild(increaseButton);
                buttonGroup.appendChild(removeButton);
                cartItem.appendChild(buttonGroup);

                cartDisplay.appendChild(cartItem);

                totalPrice += item.quantity * item.price;
            });
            totalPriceElement.textContent = totalPrice.toFixed(2);

            // Mostrar botón de limpiar carrito
            const clearCartButton = document.getElementById('clearCartButton');
            if (cart.length > 0) {
                clearCartButton.style.display = "block";
            } else {
                clearCartButton.style.display = "none";
            }
        }
    }

    // Implementar la función para limpiar el carrito
    function clearCart() {
        cart = [];
        localStorage.removeItem('cart');
        updateCartDisplay();
    }

    const clearCartButton = document.getElementById('clearCartButton');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }

    updateCartDisplay(); // Mostrar el carrito al cargar la página
});

// Función para obtener el CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
