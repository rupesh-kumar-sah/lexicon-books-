import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Book } from './types';

const INITIAL_BOOKS: Partial<Book>[] = [
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    description: "Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.",
    price: 22.00,
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800",
    isbn: "9781786892713",
    genre: "Fiction",
    stock: 25,
    rating: 4.8,
    featured: true
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    description: "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself will perish.",
    price: 28.00,
    coverImage: "https://images.unsplash.com/photo-1543005120-a1bb3ea79ff7?auto=format&fit=crop&q=80&w=800",
    isbn: "9780593135204",
    genre: "Science Fiction",
    stock: 15,
    rating: 4.9,
    featured: true
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    description: "No matter your goals, Atomic Habits offers a proven framework for improving—every day.",
    price: 18.20,
    coverImage: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=800",
    isbn: "9780735211292",
    genre: "Self-Help",
    stock: 50,
    rating: 4.9,
    featured: true
  },
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    description: "Combining magic, mysticism, wisdom and wonder into an inspiring tale of self-discovery.",
    price: 14.50,
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800",
    isbn: "9780062315007",
    genre: "Fiction",
    stock: 30,
    rating: 4.7
  },
  {
    title: "Sapiens",
    author: "Yuval Noah Harari",
    description: "A Brief History of Humankind explores how we became who we are.",
    price: 21.99,
    coverImage: "https://images.unsplash.com/photo-1550399105-05c4a7641b02?auto=format&fit=crop&q=80&w=800",
    isbn: "9780062316097",
    genre: "History",
    stock: 20,
    rating: 4.8
  }
];

export async function seedBooks() {
  const batch = writeBatch(db);
  const booksRef = collection(db, 'books');
  
  INITIAL_BOOKS.forEach((book) => {
    const newDocRef = doc(booksRef);
    batch.set(newDocRef, { ...book, id: newDocRef.id });
  });
  
  await batch.commit();
}
